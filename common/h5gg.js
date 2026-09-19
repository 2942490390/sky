import {
	point
} from './getPoint.js'

// h5gg.js 顶部
if (typeof h5gg === 'undefined') {
	globalThis.h5gg = {
		getRangesList: () => [],
		getValue: () => 0,
		setValue: () => {},
		clearResults: () => {},
		searchNumber: () => {},
		searchNearby: () => {},
		editAll: () => {},
		getResults: () => [],
		getResultsCount: () => 0,
		require: () => {}
	}
	uni.showToast({
		icon: 'none',
		title: '未检测到 H5GG 环境'
	})
}


// ================= 通用工具 =================
export function customDelay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export function jiasu(str) {
	h5gg.setValue(sudu, str, 'F32')
}

export function addrjump(addr) {
	return Number(h5gg.getValue(addr, 'I64'))
}

function getMain() {
	let list = h5gg.getRangesList(0)
	if (list && list.length > 0) {
		return {
			mainBase: list[0].start,
			mainEnd: list[0].end,
			mainName: list[0].name
		}
	}
	return null
}

function writeSafe(addrNum, val, type) {
	if (!addrNum || addrNum <= 0) return false
	try {
		h5gg.setValue('0x' + addrNum.toString(16), val, type)
		return true
	} catch (e) {
		return false
	}
}

// ================= Offsets 缓存 =================
let Offsets = null
let offsetsPromise = null

function ensureOffsets() {
	if (Offsets) return Promise.resolve(Offsets)
	if (!offsetsPromise) {
		offsetsPromise = Promise.resolve(point())
			.then(res => {
				Offsets = res || {};
				return Offsets
			})
			.catch(err => {
				offsetsPromise = null;
				throw err
			})
	}
	return offsetsPromise
}

function getPtrSync(key) {
	if (!Offsets) return null
	const cfg = Offsets[key]
	if (!cfg) return null
	const main = getMain()
	if (!main) return null
	let addr = Number(main.mainBase) + cfg[0]
	const chain = cfg[1]
	for (let i = 0; i < chain.length - 1; i++) {
		addr = addrjump(addr) + chain[i]
	}
	return addrjump(addr) + chain[chain.length - 1]
}

export async function getPtr(key) {
	await ensureOffsets()
	return getPtrSync(key)
}

export function clearOffsets() {
	Offsets = null
	offsetsPromise = null
}



// ================= 无限能量 =================
let energyTimer = null
let energyAddr = null

export async function energyLoop(checked, num = 99) {
	if (energyTimer) {
		clearTimeout(energyTimer);
		energyTimer = null
	}
	if (!checked) {
		console.log('无限能量：已停止');
		return
	}

	if (!energyAddr) {
		energyAddr = await getPtr('energy')
		uni.showToast({
			icon: 'none',
			title: energyAddr ? '0x' + energyAddr.toString(16) : '未找到'
		});
		console.log('无限能量地址:', energyAddr ? '0x' + energyAddr.toString(16) : '未找到')
	}
	if (!energyAddr) {
		console.log('无限能量：地址无效');
		return
	}

	writeSafe(energyAddr, num, 'F32')
	energyTimer = setTimeout(() => energyLoop(true, num), 50)
}

export function stopEnergyLoop() {
	if (energyTimer) {
		clearTimeout(energyTimer);
		energyTimer = null
	}
	energyAddr = null
}




// ================= 无限烟花 =================
let fireworkTimer = null
let fireworkAddr = null

export async function fireworkLoop(checked, num = 5) {
	if (fireworkTimer) {
		clearTimeout(fireworkTimer);
		fireworkTimer = null
	}
	if (!checked) {
		console.log('无限烟花：已停止');
		return
	}

	if (!fireworkAddr) {
		fireworkAddr = await getPtr('wxyh')
		uni.showToast({
			icon: 'none',
			title: fireworkAddr ? '0x' + fireworkAddr.toString(16) : '未找到'
		})
		// console.log('无限烟花地址:', fireworkAddr ? '0x' + fireworkAddr.toString(16) : '未找到')
	}
	if (!fireworkAddr) {
		console.log('无限烟花：地址无效');
		return
	}

	writeSafe(fireworkAddr, num, 'I32')
	fireworkTimer = setTimeout(() => fireworkLoop(true, num), 50)
}

export function stopFireworkLoop() {
	if (fireworkTimer) {
		clearTimeout(fireworkTimer);
		fireworkTimer = null
	}
	fireworkAddr = null
}



// ================= 全局加速 =================
let speedTimer = null
let speedAddr = null
let currentSpeed = 1.0

export async function speedLoop(enabled, value) {
	if (speedTimer) {
		clearTimeout(speedTimer);
		speedTimer = null
	}

	if (!enabled) {
		if (speedAddr) writeSafe(speedAddr, 1.0, 'F32')
		currentSpeed = 1.0
		console.log('全局加速：已停止')
		return
	}

	if (typeof value === 'number' && !isNaN(value)) currentSpeed = value

	if (!speedAddr) {
		speedAddr = await getPtr('sudu')
		uni.showToast({
			icon: 'none',
			title: speedAddr ? '0x' + speedAddr.toString(16) : '未找到'
		})
		console.log('全局加速地址:', speedAddr ? '0x' + speedAddr.toString(16) : '未找到')
	}
	if (!speedAddr) {
		console.log('全局加速：地址无效');
		return
	}

	writeSafe(speedAddr, currentSpeed, 'F32')
	speedTimer = setTimeout(() => speedLoop(true), 100)
}

export function setSpeed(value) {
	if (typeof value !== 'number' || isNaN(value)) return
	currentSpeed = value
	if (speedAddr) writeSafe(speedAddr, currentSpeed, 'F32')
}

export function stopSpeedLoop() {
	if (speedTimer) {
		clearTimeout(speedTimer);
		speedTimer = null
	}
	if (speedAddr) writeSafe(speedAddr, 1.0, 'F32')
	speedAddr = null
	currentSpeed = 1.0
}

// ================= 自燃 / 炸花（分片，防卡死） =================
const SLICE_PER_LOOP = 4
const LOOP_DELAY = 280
const BURN_MAX = 512
const BURN_STEP = 464
const BLOOM_MAX = 512
const BLOOM_STEP = 8

let burnTimer = null
let bloomTimer = null
let burnAddr = null
let bloomAddr = null


let burnState = {
	index: 0,
	coolDown: 0
}
let bloomState = {
	index: 0,
	coolDown: 0
}

export async function burnLoop(enabled) {
	if (burnTimer) {
		clearTimeout(burnTimer);
		burnTimer = null
	}
	if (!enabled) {
		console.log('自燃炸花：已停止')
		burnState = {
			index: 0,
			coolDown: 0
		}
		return
	}
	if (!burnAddr) {
		burnAddr = await getPtr('lzaddr')
		uni.showToast({
			icon: 'none',
			title: burnAddr ? '0x' + burnAddr.toString(16) : '未找到'
		})
		console.log('自燃炸花地址:', burnAddr ? '0x' + burnAddr.toString(16) : '未找到')
	}
	if (burnAddr && burnAddr > 0) {
		const start = burnState.index
		const end = Math.min(start + SLICE_PER_LOOP, BURN_MAX)
		for (let j = start; j < end; j++) {
			writeSafe(burnAddr + BURN_STEP * j, 1, 'F32')
		}
		burnState.index = (end >= BURN_MAX) ? 0 : end
	} else {
		burnState.coolDown++
		if (burnState.coolDown > 10) {
			burnState.coolDown = 0;
			burnAddr = null
		}
	}
	burnTimer = setTimeout(() => burnLoop(true), LOOP_DELAY)
}

export async function bloomLoop(enabled) {
	if (bloomTimer) {
		clearTimeout(bloomTimer);
		bloomTimer = null
	}
	if (!enabled) {
		console.log('自动炸花：已停止')
		bloomState = {
			index: 0,
			coolDown: 0
		}
		return
	}
	if (!bloomAddr) {
		bloomAddr = await getPtr('zhuahua')
		console.log('自动炸花地址:', bloomAddr ? '0x' + bloomAddr.toString(16) : '未找到')
	}
	if (bloomAddr && bloomAddr > 0) {
		const start = bloomState.index
		const end = Math.min(start + SLICE_PER_LOOP, BLOOM_MAX)
		for (let j = start; j < end; j++) {
			writeSafe(bloomAddr + BLOOM_STEP * j, 0, 'F32')
		}
		bloomState.index = (end >= BLOOM_MAX) ? 0 : end
	} else {
		bloomState.coolDown++
		if (bloomState.coolDown > 10) {
			bloomState.coolDown = 0;
			bloomAddr = null
		}
	}
	bloomTimer = setTimeout(() => bloomLoop(true), LOOP_DELAY)
}

export function stopBurnLoop() {
	if (burnTimer) {
		clearTimeout(burnTimer);
		burnTimer = null
	}
	burnAddr = null
	burnState = {
		index: 0,
		coolDown: 0
	}
}

export function stopBloomLoop() {
	if (bloomTimer) {
		clearTimeout(bloomTimer);
		bloomTimer = null
	}
	bloomAddr = null
	bloomState = {
		index: 0,
		coolDown: 0
	}
}

let hiddleCandleAddr = null;
const STEP = 0x80; // 每个蜡烛间隔
const TOTAL = 320; // 蜡烛数量
const BATCH_SIZE = 8; // 每批处理个数

/**
 * 设置蜡烛可见性
 * @param {boolean} visible - true 显示，false 隐藏
 */
export async function setCandleVisibility(visible) {
	try {
		// 1. 获取地址（只获取一次）
		if (!hiddleCandleAddr) {
			hiddleCandleAddr = await getPtr('yclz')
			if (!hiddleCandleAddr) {
				console.warn('[蜡烛] 地址未找到')
				if (typeof uni !== 'undefined' && uni.showToast) {
					uni.showToast({
						icon: 'none',
						title: '蜡烛地址未找到'
					})
				}
				return false
			}
			console.log('[蜡烛] 地址:', '0x' + hiddleCandleAddr.toString(16))
			if (typeof uni !== 'undefined' && uni.showToast) {
				uni.showToast({
					icon: 'none',
					title: '0x' + hiddleCandleAddr.toString(16)
				})
			}
		}

		const base = Number(hiddleCandleAddr)
		if (!base || base <= 0) {
			console.warn('[蜡烛] base 无效:', base)
			hiddleCandleAddr = null
			return false
		}

		const value = visible ? 25608 : 28673

		// 2. 分批写值
		const totalBatches = Math.ceil(TOTAL / BATCH_SIZE)
		for (let batch = 0; batch < totalBatches; batch++) {
			const start = batch * BATCH_SIZE
			const end = Math.min(start + BATCH_SIZE, TOTAL)
			for (let i = start; i < end; i++) {
				const addr = (base - STEP * i).toString()
				try {
					h5gg.setValue(addr, value, 'I32')
				} catch (err) {
					console.warn('[蜡烛] setValue 失败:', addr, err)
				}
			}
			// ★ 每 4 批让出主线程（用 await 而不是忙等）
			if (batch % 4 === 3) {
				await new Promise(r => setTimeout(r, 0))
			}
		}

		console.log('[蜡烛]', visible ? '显示' : '隐藏', '完成')
		return true
	} catch (err) {
		console.error('[setCandleVisibility] 出错:', err)
		hiddleCandleAddr = null
		return false
	}
}



/**
 * 清蜡烛地址缓存（切换进程后调用）
 */
export function clearCandleAddr() {
	hiddleCandleAddr = null
}



/** 清所有功能地址缓存，配置更新后调用 */
export function clearAllAddrCache() {
	energyAddr = null
	speedAddr = null
	burnAddr = null
	bloomAddr = null
	fireworkAddr = null
	hiddleCandleAddr = null
}