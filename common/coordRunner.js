// common/coordRunner.js
// 依赖: h5gg.js 提供的 getPtr / addrjump
// 功能: 坐标读取 / 单轴写入 / 传送 / 自动跑图循环

import { getPtr, readHexU32 } from './h5gg.js'
import { AUTO_RUN_POINTS } from './autoRunPoints.js'

// ================= 缓存状态 =================
let coordTimer = null
let coordCallback = null

let cachedRwdzAddr = 0     // getPtr('rwdz') 回灌的 x 地址
let cachedXAddr = 0        // x 的地址（z = +4, y = +8）
let cachedFlagAddr = 0     // 特征值 -1061397986 的地址，自身Hex: 0xC0BC5A1E
let cachedKey35Addr = 0    // 特征值 -188 处必须是 35

const FEATURE_VAL = -1061397986
const CHECK_35 = 35
const SEARCH_RANGE_MIN = '0x120000000'
const SEARCH_RANGE_MAX = '0x200000000'

// 提供给外部失效
export function invalidateRwdzCache() {
	cachedRwdzAddr = 0
}

// ================= 缓存工具 =================

// 读一次缓存坐标，返回 null 表示缓存失效/未命中
function readFromCache() {
	if (!cachedXAddr) return null
	try {
		// ★ 改用 readHexU32 进行强校验
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

// 校验并回灌缓存：给定疑似特征值地址，验证通过则写缓存并返回坐标
function trySetCacheFromAddr(addrNum) {
	try {
		if (!Number.isFinite(addrNum) || addrNum <= 0) return null

		const flagAddr = addrNum
		const key35Addr = addrNum - 188
		const xAddr = addrNum - 148

		// ★ 强制校验自身 Hex 值必须是 0xC0BC5A1E
		const hexStr = readHexU32(flagAddr)
		if (hexStr !== '0xC0BC5A1E') return null

		const v35 = Number(h5gg.getValue('0x' + key35Addr.toString(16), 'I32'))
		if (v35 !== CHECK_35) return null

		const x = Number(h5gg.getValue('0x' + xAddr.toString(16), 'F32'))
		const z = Number(h5gg.getValue('0x' + (xAddr + 4).toString(16), 'F32'))
		const y = Number(h5gg.getValue('0x' + (xAddr + 8).toString(16), 'F32'))
		if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) return null

		cachedFlagAddr = flagAddr
		cachedKey35Addr = key35Addr
		cachedXAddr = xAddr
		return { x, z, y }
	} catch (e) {
		return null
	}
}

// 搜索一次并更新缓存
function searchAndCache() {
	h5gg.clearResults()
	try {
		h5gg.searchNumber(String(FEATURE_VAL), 'I32', SEARCH_RANGE_MIN, SEARCH_RANGE_MAX)
		h5gg.searchNumber(String(FEATURE_VAL), 'I32', SEARCH_RANGE_MIN, SEARCH_RANGE_MAX)
		const count = h5gg.getResultsCount()
		if (count === 0) {
			invalidateCache()
			return null
		}
		const raw = h5gg.getResults(count) || {}
		for (let i = 0; i < raw.length; i++) {
			const r = trySetCacheFromAddr(Number(raw[i].address))
			if (r) return r
		}
		invalidateCache()
		return null
	} catch (e) {
		invalidateCache()
		return null
	}
}

/**
 * 指针链兜底：走 getPtr('rwdz') 读坐标
 * 成功则回灌缓存（xAddr 直接就是 getPtr 返回值）
 */
async function readByPtr() {
	let xAddr
	try {
		xAddr = await getPtr('rwdz')
	} catch { return null }
	if (!xAddr) return null

	try {
		const x = Number(h5gg.getValue('0x' + xAddr.toString(16), 'F32'))
		const z = Number(h5gg.getValue('0x' + (xAddr + 4).toString(16), 'F32'))
		const y = Number(h5gg.getValue('0x' + (xAddr + 8).toString(16), 'F32'))
		if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(y)) {
			cachedRwdzAddr = 0
			return null
		}

		// ★ 回灌三元组，读/写共用
		// 依据 trySetCacheFromAddr 反推：flagAddr = xAddr + 148，key35Addr = xAddr - 40
		cachedRwdzAddr = xAddr
		cachedXAddr = xAddr
		cachedFlagAddr = xAddr + 148
		cachedKey35Addr = xAddr - 40
		return { x, z, y }
	} catch { return null }
}



/**
 * 使缓存失效
 */
function invalidateCache() {
	cachedXAddr = 0
	cachedFlagAddr = 0
	cachedKey35Addr = 0
	h5gg.clearResults()
}

export function invalidateCoordCache() {
	invalidateCache()
}

// ================= 坐标读取 =================

/**
 * 读取一次坐标（三层兜底）
 * 1. 缓存
 * 2. 搜索
 * 3. 指针链
 */
export async function readCoordOnce() {
	// const cached = readFromCache()
	// if (cached) return cached

	// const searched = searchAndCache()
	// if (searched) return searched

	return readByPtr()
}

/**
 * 启动坐标轮询
 */
export function startCoordLoop(cb, interval = 500) {
	stopCoordLoop()
	coordCallback = cb
	const tick = async () => {
		if (!coordCallback) return
		try {
			const c = await readCoordOnce()
			if (c && coordCallback) coordCallback(c)
		} catch (e) {
			console.warn('[coordRunner] readCoordOnce 异常:', e)
		}
		if (coordCallback) {
			coordTimer = setTimeout(tick, interval)
		}
	}
	tick()
}

export function stopCoordLoop() {
	if (coordTimer) {
		clearTimeout(coordTimer)
		coordTimer = null
	}
	coordCallback = null
}

// ================= 单轴 / 整体瞬移（读写共用缓存） =================

/**
 * 修改某一轴坐标
 * ★ 和读坐标共用 cachedXAddr，不再每次 getPtr
 * @param {'x'|'z'|'y'} axis
 * @param {number} value
 */
export async function setCoordAxis(axis, value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false

	// ★ 直接用缓存的地址；没有缓存就先触发一次读取拿到地址
	if (!cachedXAddr) {
		// 没有地址缓存，先读一次让地址缓存命中
		await readCoordOnce()
	}
	if (!cachedXAddr) return false

	const offset = axis === 'x' ? 0 : axis === 'z' ? 4 : 8
	const target = '0x' + (cachedXAddr + offset).toString(16)
	h5gg.setValue(target, v, 'F32')
	return true
}

/**
 * 瞬移到指定 XYZ
 * ★ 和读坐标共用缓存地址
 */
export async function teleportTo(x, z, y) {
	if (!cachedXAddr) {
		await readCoordOnce()
	}
	if (!cachedXAddr) return false
	h5gg.setValue('0x' + cachedXAddr.toString(16), x, 'F32')
	h5gg.setValue('0x' + (cachedXAddr + 4).toString(16), z, 'F32')
	h5gg.setValue('0x' + (cachedXAddr + 8).toString(16), y, 'F32')
	return true
}

// ================= 自动跑图 =================

let autoRunTimer = null
let autoRunRunning = false
let autoRunIndex = 0
let autoRunIntervalSec = 3.8

// ★ 防止重复启动
let autoRunStarting = false

/**
 * 启动 / 暂停 / 继续
 */
export async function startAutoRun(opts = {}) {
	if (autoRunStarting) {
		console.warn('[coordRunner] startAutoRun 正在启动中，忽略本次调用')
		return
	}
	autoRunStarting = true

	try {
		const {
			intervalSec = 3.8,
			reset = false,
			onStep,
			onFinish
		} = opts

		if (autoRunTimer) {
			clearTimeout(autoRunTimer)
			autoRunTimer = null
		}

		if (reset) autoRunIndex = 0
		autoRunIntervalSec = Number.isFinite(intervalSec) && intervalSec >= 0 ? intervalSec : 3.0
		autoRunRunning = true

		const step = async () => {
			if (!autoRunRunning) return

			try {
				if (autoRunIndex >= AUTO_RUN_POINTS.length) {
					stopAutoRun()
					try {
						onFinish && onFinish()
					} catch (cbErr) {
						console.error('[coordRunner] onFinish 回调异常:', cbErr)
					}
					return
				}

				const p = AUTO_RUN_POINTS[autoRunIndex]
				await teleportTo(p[0], p[1], p[2])

				if (!autoRunRunning) return

				try {
					onStep && onStep(autoRunIndex, AUTO_RUN_POINTS.length)
				} catch (cbErr) {
					console.error('[coordRunner] onStep 回调异常:', cbErr)
				}

				autoRunIndex++
			} catch (e) {
				console.error('[coordRunner] step 异常:', e)
			} finally {
				if (autoRunRunning) {
					autoRunTimer = setTimeout(step, autoRunIntervalSec * 1000)
				}
			}
		}

		step()
	} finally {
		autoRunStarting = false
	}
}

export function stopAutoRun() {
	autoRunRunning = false
	if (autoRunTimer) {
		clearTimeout(autoRunTimer)
		autoRunTimer = null
	}
}

export function resetAutoRunIndex() {
	autoRunIndex = 0
}

export function isAutoRunRunning() {
	return autoRunRunning
}

export function getAutoRunProgress() {
	return {
		current: autoRunIndex,
		total: AUTO_RUN_POINTS.length
	}
}

export function getAutoRunPointsCount() {
	return AUTO_RUN_POINTS.length
}

/**
 * ★ 强制重置跑图模块状态（切页面/异常时用）
 */
export function resetAutoRunModule() {
	stopAutoRun()
	autoRunIndex = 0
	autoRunStarting = false
}