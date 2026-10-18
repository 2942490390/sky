// common/coordRunner.js
// 依赖: h5gg.js 提供的 getPtr / addrjump
// 功能: 坐标读取 / 单轴写入 / 传送 / 自动跑图循环

import {
	getPtr
} from './h5gg.js'
import {
	AUTO_RUN_POINTS
} from './autoRunPoints.js'

// ================= 坐标读取 =================

let coordTimer = null
let coordCallback = null

/**
 * 读取一次坐标
 * @returns {Promise<{x:number,z:number,y:number}|null>}
 */
export async function readCoordOnce() {
	const addr = await getPtr('rwdz')
	if (!addr || addr <= 0) return null
	try {
		const x = Number(h5gg.getValue('0x' + addr.toString(16), 'F32'))
		const z = Number(h5gg.getValue('0x' + (addr + 4).toString(16), 'F32'))
		const y = Number(h5gg.getValue('0x' + (addr + 8).toString(16), 'F32'))
		return {
			x,
			z,
			y
		}
	} catch (e) {
		return null
	}
}

/**
 * 启动坐标轮询
 * @param {(c:{x:number,z:number,y:number})=>void} cb
 * @param {number} interval ms
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
			// 忽略单次读取异常，继续轮询
			console.warn('[coordRunner] readCoordOnce 异常:', e)
		}
		// ★ 保证下一轮一定被调度
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

// ================= 单轴 / 整体瞬移 =================

/**
 * 修改某一轴坐标
 * @param {'x'|'z'|'y'} axis
 * @param {number} value
 */
export async function setCoordAxis(axis, value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false
	try {
		const addr = await getPtr('rwdz')
		if (!addr || addr <= 0) return false
		console.log(addr.toString(16))
		const offset = axis === 'x' ? 0 : axis === 'z' ? 4 : 8
		h5gg.setValue('0x' + (addr + offset).toString(16), v, 'F32')
		return true
	} catch (e) {
		console.warn('[coordRunner] setCoordAxis 异常:', e)
		return false
	}
}

/**
 * 瞬移到指定 XYZ
 */
export async function teleportTo(x, z, y) {
	try {
		const addr = await getPtr('rwdz')
		if (!addr || addr <= 0) return false
		h5gg.setValue('0x' + addr.toString(16), x, 'F32')
		h5gg.setValue('0x' + (addr + 4).toString(16), z, 'F32')
		h5gg.setValue('0x' + (addr + 8).toString(16), y, 'F32')
		return true
	} catch (e) {
		console.warn('[coordRunner] teleportTo 异常:', e)
		return false
	}
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
 * @param {object} opts
 * @param {number} opts.intervalSec 间隔秒数，默认 3.8
 * @param {boolean} opts.reset 是否从第一个点重新开始
 * @param {(idx:number, total:number)=>void} opts.onStep 每步回调
 * @param {()=>void} opts.onFinish 结束时回调
 */
export async function startAutoRun(opts = {}) {
	// ★ 防止重复调用
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

		// ★ 先清掉旧定时器
		if (autoRunTimer) {
			clearTimeout(autoRunTimer)
			autoRunTimer = null
		}

		if (reset) autoRunIndex = 0
		autoRunIntervalSec = intervalSec > 0 ? intervalSec : 3.8
		autoRunRunning = true

		const step = async () => {
			// ★ 停止标志检查
			if (!autoRunRunning) return

			try {
				// ★ 到终点
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
				// ★ teleportTo 内部已 try/catch，不会抛
				await teleportTo(p[0], p[1], p[2])

				// ★ 用户可能在 await 期间停了跑图
				if (!autoRunRunning) return

				try {
					onStep && onStep(autoRunIndex, AUTO_RUN_POINTS.length)
				} catch (cbErr) {
					console.error('[coordRunner] onStep 回调异常:', cbErr)
				}

				autoRunIndex++
			} catch (e) {
				// ★ 任何异常都不能中断循环
				console.error('[coordRunner] step 异常:', e)
			} finally {
				// ★ 关键：只要还在跑，就一定调度下一轮
				if (autoRunRunning) {
					autoRunTimer = setTimeout(step, autoRunIntervalSec * 1000)
				}
			}
		}

		// ★ 启动
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