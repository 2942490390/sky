// common/coordRunner.js
import { getPtr, readHexU32 } from './h5gg.js'
import { AUTO_RUN_POINTS } from './autoRunPoints.js'

// ================= 缓存状态 =================
let coordTimer = null
let coordCallback = null
let coordLoopRunning = false          // ★ 新增：循环运行标志

let cachedXAddr = 0                    // x 的地址（z = +4, y = +8）
let cachedFlagAddr = 0                 // 特征值地址
let cachedKey35Addr = 0                // 特征值 -188 处必须是 35

const FEATURE_VAL = -1061397986
const CHECK_35 = 35
const SEARCH_RANGE_MIN = '0x120000000'
const SEARCH_RANGE_MAX = '0x200000000'

export function invalidateRwdzCache() {
	cachedXAddr = 0
	cachedFlagAddr = 0
	cachedKey35Addr = 0
}

// ================= 缓存有效性校验 =================
// 用缓存的地址读一次，校验特征值是否还对，对就返回坐标，否则返回 null
function readFromCache() {
	if (!cachedXAddr) return null
	try {
		const hexStr = readHexU32(cachedFlagAddr)
		if (hexStr !== '0xC0BC5A1E') return null

		const c35 = Number(h5gg.getValue('0x' + cachedKey35Addr.toString(16), 'I32'))
		if (c35 !== CHECK_35) return null

		const x = Number(h5gg.getValue('0x' + cachedXAddr.toString(16), 'F32'))
		const z = Number(h5gg.getValue('0x' + (cachedXAddr + 4).toString(16), 'F32'))
		const y = Number(h5gg.getValue('0x' + (cachedXAddr + 8).toString(16), 'F32'))
		if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return null
		return { x, z, y }
	} catch (e) {
		return null
	}
}

// 首次定位：走 getPtr('rwdz') 拿到 x 地址，回灌缓存，返回坐标
async function readByPtrAndCache() {
	let xAddr
	try {
		xAddr = await getPtr('rwdz')
	} catch { return null }
	if (!xAddr) return null

	try {
		const x = Number(h5gg.getValue('0x' + xAddr.toString(16), 'F32'))
		const z = Number(h5gg.getValue('0x' + (xAddr + 4).toString(16), 'F32'))
		const y = Number(h5gg.getValue('0x' + (xAddr + 8).toString(16), 'F32'))
		if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return null

		// ★ 回灌缓存，后续直接用 cachedXAddr
		cachedXAddr = xAddr
		cachedFlagAddr = xAddr + 148
		cachedKey35Addr = xAddr - 40
		return { x, z, y }
	} catch { return null }
}

// ================= 坐标读取 =================
/**
 * 读一次坐标：
 * 1. 有缓存 → 校验缓存，有效直接用
 * 2. 无缓存/缓存失效 → getPtr 定位一次，回灌缓存
 */
export async function readCoordOnce() {
	const cached = readFromCache()
	if (cached) return cached

	const fresh = await readByPtrAndCache()  // 首次 / 缓存失效才走这里
	if (fresh) return fresh

	// 都失败，清缓存，下次重新来
	invalidateRwdzCache()
	return null
}

/**
 * 确保地址已缓存（不返回坐标，只保证 cachedXAddr 有值）
 * 供 setCoordAxis / teleportTo 首次调用时用
 */
export async function ensureCoordAddrCached() {
	if (cachedXAddr) {
		// 验证一下缓存还有效
		if (readFromCache()) return true
		invalidateRwdzCache()
	}
	const fresh = await readByPtrAndCache()
	return !!fresh
}

// ================= 启动 / 停止坐标轮询 =================
/**
 * ★ 改：不立即 tick，延迟首次执行；加 running 标志
 * @param {Function} cb 回调 (coord) => void
 * @param {number} interval 轮询间隔 ms
 * @param {number} firstDelay 首次延迟 ms（避免 mounted 瞬间读内存）
 */
export function startCoordLoop(cb, interval = 500, firstDelay = 300) {
	stopCoordLoop()
	coordCallback = cb
	coordLoopRunning = true

	const tick = async () => {
		if (!coordLoopRunning || !coordCallback) return

		try {
			const c = await readCoordOnce()
			if (c && coordCallback && coordLoopRunning) coordCallback(c)
		} catch (e) {
			console.warn('[coordRunner] readCoordOnce 异常:', e)
		}

		if (coordLoopRunning && coordCallback) {
			coordTimer = setTimeout(tick, interval)
		}
	}

	// ★ 关键：首次延迟，避免 mounted 瞬间读内存
	coordTimer = setTimeout(tick, firstDelay)
}

export function stopCoordLoop() {
	coordLoopRunning = false
	if (coordTimer) {
		clearTimeout(coordTimer)
		coordTimer = null
	}
	coordCallback = null
}

// ================= 单轴 / 整体瞬移 =================
export async function setCoordAxis(axis, value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false

	const ok = await ensureCoordAddrCached()
	if (!ok || !cachedXAddr) return false

	const offset = axis === 'x' ? 0 : axis === 'z' ? 4 : 8
	h5gg.setValue('0x' + (cachedXAddr + offset).toString(16), v, 'F32')
	return true
}

export async function teleportTo(x, z, y) {
	const ok = await ensureCoordAddrCached()
	if (!ok || !cachedXAddr) return false
	h5gg.setValue('0x' + cachedXAddr.toString(16), x, 'F32')
	h5gg.setValue('0x' + (cachedXAddr + 4).toString(16), z, 'F32')
	h5gg.setValue('0x' + (cachedXAddr + 8).toString(16), y, 'F32')
	return true
}

// ================= 自动跑图（保持原逻辑） =================
let autoRunTimer = null
let autoRunRunning = false
let autoRunIndex = 0
let autoRunIntervalSec = 3.8
let autoRunStarting = false

export async function startAutoRun(opts = {}) {
	if (autoRunStarting) return
	autoRunStarting = true
	try {
		const { intervalSec = 3.8, reset = false, onStep, onFinish } = opts
		if (autoRunTimer) { clearTimeout(autoRunTimer); autoRunTimer = null }
		if (reset) autoRunIndex = 0
		autoRunIntervalSec = Number.isFinite(intervalSec) && intervalSec >= 0 ? intervalSec : 3.0
		autoRunRunning = true

		const step = async () => {
			if (!autoRunRunning) return
			try {
				if (autoRunIndex >= AUTO_RUN_POINTS.length) {
					stopAutoRun()
					try { onFinish && onFinish() } catch (e) {}
					return
				}
				const p = AUTO_RUN_POINTS[autoRunIndex]
				await teleportTo(p[0], p[1], p[2])
				if (!autoRunRunning) return
				try { onStep && onStep(autoRunIndex, AUTO_RUN_POINTS.length) } catch (e) {}
				autoRunIndex++
			} catch (e) {
				console.error('[coordRunner] step 异常:', e)
			} finally {
				if (autoRunRunning) autoRunTimer = setTimeout(step, autoRunIntervalSec * 1000)
			}
		}
		step()
	} finally {
		autoRunStarting = false
	}
}

export function stopAutoRun() {
	autoRunRunning = false
	if (autoRunTimer) { clearTimeout(autoRunTimer); autoRunTimer = null }
}
export function resetAutoRunIndex() { autoRunIndex = 0 }
export function isAutoRunRunning() { return autoRunRunning }
export function getAutoRunProgress() {
	return { current: autoRunIndex, total: AUTO_RUN_POINTS.length }
}
export function resetAutoRunModule() {
	stopAutoRun()
	autoRunIndex = 0
	autoRunStarting = false
}