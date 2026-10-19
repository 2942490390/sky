// common/entertainment.js
// 娱乐功能独立模块（从 demo10 移植，统一用递归 setTimeout 防止崩溃）
// 依赖：h5gg.js 的 getPtr / getModuleAddr

import { getPtr, getModuleAddr } from './h5gg.js'

// ============================================================
// 内部工具
// ============================================================

/** 地址统一转 number（getPtr 可能返回 I64 字符串/BigInt/number） */
function toAddrNum(v) {
	if (v === null || v === undefined) return 0
	if (typeof v === 'bigint') return Number(v)
	const n = Number(v)
	return Number.isFinite(n) && n > 0 ? n : 0
}

/** 安全写内存，失败不抛 */
function safeWrite(addr, value, type) {
	const a = toAddrNum(addr)
	if (!a) return false
	try {
		h5gg.setValue('0x' + a.toString(16), value, type)
		return true
	} catch (e) {
		return false
	}
}

function toast(msg) {
	try { uni.showToast({ icon: 'none', title: String(msg), duration: 1500 }) } catch (e) {}
}

// ============================================================
// 通用循环控制器
// 说明：所有功能共用此控制器
//  - 递归 setTimeout（不用 setInterval，杜绝回调堆积）
//  - 每轮都校验地址是否有效，失效自动停止
//  - stop() 可随时安全停止
//  - 支持两种取址方式：
//      key     → 走 getPtr（offsets.config.js 指针链）
//      addrFn  → 自定义（如 getModuleAddr 直接地址），优先于 key
// ============================================================

/**
 * @param {object} opts
 * @param {string}   [opts.key]      offsets.config.js 里的 key（走 getPtr）
 * @param {function} [opts.addrFn]   自定义地址函数（优先于 key），返回 number 或 Promise<number>
 * @param {number}   opts.value      写入值
 * @param {string}   opts.type       写入类型 'I32' | 'F32'
 * @param {number}   [opts.interval] 循环间隔 ms（默认 100）
 * @param {boolean}  [opts.reResolve] 地址失效时是否自动重取（默认 true）
 * @param {function} [opts.onFail]   获取地址失败回调（可选）
 */
function createWriteLoop(opts) {
	const {
		key,
		addrFn,
		value,
		type,
		interval = 100,
		reResolve = true,
		onFail
	} = opts

	let timer = null
	let running = false
	let addr = 0
	let failCount = 0

	async function resolveAddr() {
		try {
			if (typeof addrFn === 'function') {
				return toAddrNum(await addrFn())
			}
			if (key) {
				return toAddrNum(await getPtr(key))
			}
		} catch (e) {}
		return 0
	}

	async function tick() {
		if (!running) return

		if (!addr && reResolve) {
			addr = await resolveAddr()
			if (!addr) {
				failCount++
				if (failCount === 1 && typeof onFail === 'function') {
					onFail()
				}
				if (failCount > 10) {
					// 连续 10 次失败，停止
					running = false
					return
				}
				timer = setTimeout(tick, Math.max(interval, 500))
				return
			}
			failCount = 0
		}

		if (addr) {
			safeWrite(addr, value, type)
		}

		timer = setTimeout(tick, interval)
	}

	return {
		async start() {
			if (running) return
			running = true
			failCount = 0
			addr = 0
			await tick()
		},
		stop() {
			running = false
			if (timer) {
				clearTimeout(timer)
				timer = null
			}
			addr = 0
		},
		isRunning() {
			return running
		}
	}
}

// ============================================================
// 通用分片批写控制器（类似已有 burnLoop / bloomLoop）
//  - 每 tick 写一片，避免一次性写大量内存卡死
//  - 一轮写完后回到 0 重新循环
//  - 支持 key / addrFn 两种取址方式
// ============================================================

/**
 * @param {object} opts
 * @param {string}   [opts.key]      offsets.config.js 里的 key
 * @param {function} [opts.addrFn]   自定义地址函数（优先于 key）
 * @param {number}   opts.value      写入值
 * @param {string}   opts.type       写入类型
 * @param {number}   opts.total      项数
 * @param {number}   opts.step       每项间隔字节
 * @param {number}   [opts.slice]    每 tick 写几项
 * @param {number}   [opts.interval] 每 tick 间隔 ms
 * @param {function} [opts.onFail]   获取地址失败回调
 */
function createBatchLoop(opts) {
	const {
		key,
		addrFn,
		value,
		type,
		total,
		step,
		slice = 4,
		interval = 200,
		onFail
	} = opts

	let timer = null
	let running = false
	let addr = 0
	let index = 0
	let failCount = 0

	async function resolveAddr() {
		try {
			if (typeof addrFn === 'function') {
				return toAddrNum(await addrFn())
			}
			if (key) {
				return toAddrNum(await getPtr(key))
			}
		} catch (e) {}
		return 0
	}

	async function tick() {
		if (!running) return

		if (!addr) {
			addr = await resolveAddr()
			if (!addr) {
				failCount++
				if (failCount === 1 && typeof onFail === 'function') onFail()
				if (failCount > 10) {
					running = false
					return
				}
				timer = setTimeout(tick, Math.max(interval, 500))
				return
			}
			failCount = 0
			index = 0
		}

		const start = index
		const end = Math.min(start + slice, total)
		for (let i = start; i < end; i++) {
			safeWrite(addr + step * i, value, type)
		}
		index = (end >= total) ? 0 : end

		timer = setTimeout(tick, interval)
	}

	return {
		async start() {
			if (running) return
			running = true
			failCount = 0
			addr = 0
			index = 0
			await tick()
		},
		stop() {
			running = false
			if (timer) {
				clearTimeout(timer)
				timer = null
			}
			addr = 0
			index = 0
		},
		isRunning() {
			return running
		}
	}
}

// ============================================================
// 各功能实例
// ============================================================

// ---------- 无限能量（F32=14，循环） ----------
// 注意：你项目已有 energyLoop 写 99，如果优先使用本模块，请勿同时开
const _energy = createWriteLoop({
	key: 'energy',
	value: 14,
	type: 'F32',
	interval: 100,
	onFail: () => toast('无限能量：地址未找到')
})

export function energyLoopV2(checked) {
	if (checked) _energy.start()
	else _energy.stop()
}
export function stopEnergyLoopV2() { _energy.stop() }

// ---------- 隐身（F32=0）—— 指针链 ----------
const _invisible = createWriteLoop({
	key: 'ysaring',
	value: 0,
	type: 'F32',
	interval: 100,
	onFail: () => toast('隐身：地址未找到')
})
export function invisibleLoop(checked) {
	if (checked) _invisible.start()
	else _invisible.stop()
}
export function stopInvisibleLoop() { _invisible.stop() }

// ---------- 守护无翼（I32=0）—— 指针链 ----------
const _noWing = createWriteLoop({
	key: 'noWingGuard',
	value: 0,
	type: 'I32',
	interval: 100,
	onFail: () => toast('守护无翼：地址未找到')
})
export function noWingGuardLoop(checked) {
	if (checked) _noWing.start()
	else _noWing.stop()
}
export function stopNoWingGuardLoop() { _noWing.stop() }

// ---------- 无视冥龙（I32=0）—— dj() 直接地址 ----------
const _krill = createWriteLoop({
	addrFn: () => getModuleAddr(0x54BB8F8),
	value: 0,
	type: 'I32',
	interval: 100,
	onFail: () => toast('无视冥龙：地址未找到')
})
export function ignoreKrillLoop(checked) {
	if (checked) _krill.start()
	else _krill.stop()
}
export function stopIgnoreKrillLoop() { _krill.stop() }

// ---------- 防举报（I32=257）—— dj() 直接地址 ----------
const _antiReport = createWriteLoop({
	addrFn: () => getModuleAddr(0x50453DC),
	value: 257,
	type: 'I32',
	interval: 100,
	onFail: () => toast('防举报：地址未找到')
})
export function antiReportLoop(checked) {
	if (checked) _antiReport.start()
	else _antiReport.stop()
}
export function stopAntiReportLoop() { _antiReport.stop() }

// ---------- 解锁好友树（I32=256）—— dj() 直接地址 ----------
const _friendTree = createWriteLoop({
	addrFn: () => getModuleAddr(0x532F3D0),
	value: 256,
	type: 'I32',
	interval: 100,
	onFail: () => toast('解锁好友树：地址未找到')
})
export function friendTreeLoop(checked) {
	if (checked) _friendTree.start()
	else _friendTree.stop()
}
export function stopFriendTreeLoop() { _friendTree.stop() }

// ---------- 燃烧弹（1591 项 × 464 字节，每项 F32=1）—— 指针链 ----------
const _ignite = createBatchLoop({
	key: 'autoIgnite',
	value: 1,
	type: 'F32',
	total: 1591,
	step: 464,
	slice: 32,       // 每 tick 32 个，比 demo10 的 64 更稳
	interval: 120,
	onFail: () => toast('燃烧弹：地址未找到')
})
export function igniteLoop(checked) {
	if (checked) _ignite.start()
	else _ignite.stop()
}
export function stopIgniteLoop() { _ignite.stop() }

// ---------- 去风墙（60 项 × 2096 字节，每项 F32=0）—— 指针链 ----------
const _wall = createBatchLoop({
	key: 'fq',
	value: 0,
	type: 'F32',
	total: 60,
	step: 2096,
	slice: 4,
	interval: 150,
	onFail: () => toast('去风墙：地址未找到')
})
export function wallLoop(checked) {
	if (checked) _wall.start()
	else _wall.stop()
}
export function stopWallLoop() { _wall.stop() }

// ---------- 跳过动画（即时写，不循环）—— dj() 直接地址 ----------
export async function setSkipAnim(on) {
	const addr = toAddrNum(getModuleAddr(0x579CB00))
	if (!addr) {
		toast('跳过动画：地址未找到')
		return false
	}
	return safeWrite(addr, on ? 1 : 0, 'I32')
}

// ---------- 无限烟花（一次性写三处） ----------
// demo10:
//   Write_4(A_(A.outfit, 0x20), -1014213802)   // outfit + 0x20
//   Write_4(A.wxyha, 5000)                     // wxyha
//   Write_4(A_(A.wxyha, 4), 5000)              // wxyha + 4
// 注意：A.wxyha 是"指针解出来的对象"，A_(A.wxyha, 4) = *(A.wxyha) + 4？不是！
// 看 demo10 的 A_：A_(addr, off) = _num(Number(addr) + Number(off))
// 所以 A_(A.wxyha, 4) = A.wxyha + 4（直接加，不解引用）
export async function fireworkV2() {
	const outfit = toAddrNum(await getPtr('outfit'))
	const wxyha = toAddrNum(await getPtr('wxyha'))
	if (!outfit || !wxyha) {
		toast('无限烟花：地址未找到')
		return false
	}
	// outfit + 0x20 处写 I32 -1014213802
	safeWrite(outfit + 0x20, -1014213802, 'I32')
	// wxyha 和 wxyha + 4 各写 5000
	safeWrite(wxyha, 5000, 'I32')
	safeWrite(wxyha + 4, 5000, 'I32')
	toast('无限烟花开启成功\n被举报会封号!')
	return true
}







// ---------- 全局离线（双阶段，offline 用指针链） ----------
let _offlineAddr = 0
let _offlineTimer = null
let _offlineOn = false

export async function globalOffline(on) {
	if (_offlineTimer) { clearTimeout(_offlineTimer); _offlineTimer = null }
	_offlineOn = !!on

	if (!_offlineAddr) {
		_offlineAddr = toAddrNum(await getPtr('offline'))
	}
	if (!_offlineAddr) {
		toast('全局离线：地址未找到')
		return false
	}

	if (on) {
		// 1. 写 F32 28014
		safeWrite(_offlineAddr, 28014, 'F32')
		// 2. 100ms 后写两个 I32
		_offlineTimer = setTimeout(() => {
			if (!_offlineOn) return
			safeWrite(_offlineAddr + 0x74, 256, 'I32')
			safeWrite(_offlineAddr - 0xCC, 4, 'I32')
		}, 100)
	} else {
		// 1. 写 F32 28015（注意 demo10 这里写的是 Write_4，但值 28015 当 I32，可能笔误）
		// 按 demo10 原样：Write_4(A.offline, 28015) → I32
		safeWrite(_offlineAddr, 28015, 'I32')
		_offlineTimer = setTimeout(() => {
			safeWrite(_offlineAddr + 0x74, 256, 'I32')
			safeWrite(_offlineAddr - 0xCC, 3, 'I32')
		}, 100)
	}
	return true
}

export function stopGlobalOffline() {
	if (_offlineTimer) { clearTimeout(_offlineTimer); _offlineTimer = null }
	_offlineOn = false
}






// ============================================================
// 全局停止（页面卸载时统一调用）
// ============================================================
export function stopAllEntertainment() {
	_energy.stop()
	_invisible.stop()
	_noWing.stop()
	_krill.stop()
	_antiReport.stop()
	_friendTree.stop()
	_ignite.stop()
	_wall.stop()
	stopGlobalOffline()
}