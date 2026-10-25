import { point } from './getPoint.js'
import { map_point, mapIdToName, zhAlias } from './getMapPoint.js'



// h5gg.js 顶部
if (typeof h5gg === 'undefined') {
	globalThis.h5gg = {
		getRangesList: () => [],
		getValue: () => 0,
		setValue: () => { },
		clearResults: () => { },
		searchNumber: () => { },
		searchNearby: () => { },
		editAll: () => { },
		getResults: () => [],
		getResultsCount: () => 0,
		require: () => { }
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

export function writeSafe(addrNum, val, type) {
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




// h5gg.js 新增导出
export function getModuleAddr(off) {
	const main = getMain()
	return main ? Number(main.mainBase) + off : 0
}

function derefOnce(off) {
	const base = getModuleAddr(off)
	if (!base) return 0
	return Number(h5gg.getValue(base, 'I64'))
}


/**
 * 同步获取指针地址
 * @param {string} key
 * @returns {number|null}
 */
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
/**
 * 异步获取指针地址
 * @param {string} key
 * @returns {Promise<number>}
 */
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
		// console.log('无限能量：已停止');
		return
	}

	if (!energyAddr) {
		energyAddr = await getPtr('energy')
		uni.showToast({
			icon: 'none',
			title: energyAddr ? '0x' + energyAddr.toString(16) : '未找到'
		});
		// console.log('无限能量地址:', energyAddr ? '0x' + energyAddr.toString(16) : '未找到')
	}
	if (!energyAddr) {
		// console.log('无限能量：地址无效');
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
		// console.log('无限烟花：已停止');
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



// ================= 全局加速（搜索定位版） =================

// 搜索常量
const SPEED_FEATURE_I32 = '1023969417' // 特征值（I32）
const SPEED_SEARCH_FROM = '0x130000000'
const SPEED_SEARCH_TO = '0x170000000'
const SPEED_NEARBY_VALUE = '1.000000' // 邻近搜索值（F32）
const SPEED_NEARBY_RANGE = '0x64' // 邻近范围
const SPEED_OFFSET_NEXT = 24 // +24 字节处的 F32 必须为 1

let speedTimer = null
let speedAddr = null
let currentSpeed = 1.0

/**
 * 搜索加速地址（搜索定位版）
 *
 * 找到 A（I32=1023969417）和 B（A+24, F32=1.0）后：
 *   - 缓存 B 的地址到 speedAddr
 *   - 下次直接用 speedAddr，不再搜索
 *
 * @returns {Promise<number|null>} B 的地址
 */
export async function findSpeedAddr() {
	try {
		if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
			// console.warn('[加速] 无 h5gg 环境')
			return null
		}

		// ★ 缓存命中：speedAddr 已存在，直接返回
		if (speedAddr) {
			try {
				// 读一下确认地址没失效
				const test = h5gg.getValue('0x' + speedAddr.toString(16), 'F32')
				if (test !== undefined && test !== null) {
					// console.log('[加速] 使用缓存 B = 0x' + speedAddr.toString(16))
					return speedAddr
				}
			} catch (e) {
				// console.warn('[加速] 缓存失效，重新搜索', e)
				speedAddr = null
			}
		}

		// 1. 搜索特征值 I32
		h5gg.clearResults()
		h5gg.searchNumber(SPEED_FEATURE_I32, 'I32', SPEED_SEARCH_FROM, SPEED_SEARCH_TO)

		// 2. 邻近搜索 F32 == 1
		h5gg.searchNearby(SPEED_NEARBY_VALUE, 'F32', SPEED_NEARBY_RANGE)

		// 3. 拿结果
		const count = h5gg.getResultsCount()
		if (!count) {
			// console.warn('[加速] 搜索结果为空')
			h5gg.clearResults()
			return null
		}

		const raw = h5gg.getResults(count) || []
		const results = []
		for (let i = 0; i < raw.length; i++) results.push(raw[i])

		// console.log('[加速] 搜索到', results.length, '条结果')

		// 4. 建立 results 里所有地址的集合
		const addrSet = new Set()
		for (let i = 0; i < results.length; i++) {
			const item = results[i]
			if (!item || !item.address) continue
			const n = Number(item.address)
			if (Number.isFinite(n) && n > 0) addrSet.add(n)
		}
		// console.log('[加速] results 里共有', addrSet.size, '个唯一地址')

		// 5. 遍历 I32 == 1023969417 的项
		for (let i = 0; i < results.length; i++) {
			const item = results[i]
			if (!item || !item.address) continue
			if (item.type !== 'I32') continue

			const addrNum = Number(item.address)
			if (!Number.isFinite(addrNum) || addrNum <= 0) continue

			// 校验 I32 值 == 1023969417
			let v0
			if (item.value !== undefined && item.value !== null) {
				v0 = Number(item.value)
			} else {
				try {
					v0 = Number(h5gg.getValue(item.address, 'I32'))
				} catch (e) {
					continue
				}
			}
			if (v0 !== 1023969417) continue

			// B = A + 24
			const bAddr = addrNum + SPEED_OFFSET_NEXT

			// B 必须出现在 results 里
			if (!addrSet.has(bAddr)) continue

			// 读内存校验 B 处 F32 == 1.0
			const bAddrHex = '0x' + bAddr.toString(16)
			let v1
			try {
				v1 = Number(h5gg.getValue(bAddrHex, 'F32'))
			} catch (e) {
				continue
			}
			if (Math.abs(v1 - 1) > 0.0001) continue

			// ★ 三条全满足 → 缓存 B 的地址，返回 B
			h5gg.clearResults()
			speedAddr = bAddr // ★ 缓存的是 B，不是 A
			// console.log('[加速] ✅ 匹配到 B = 0x' + bAddr.toString(16) + '（A = 0x' + addrNum.toString(16) + '）')
			return bAddr
		}

		h5gg.clearResults()
		// console.warn('[加速] 未匹配到符合条件的地址')
		return null
	} catch (e) {
		// console.warn('[加速] 搜索异常', e)
		return null
	}
}

/**
 * 全局加速主循环
 * @param {boolean} enabled 是否开启
 * @param {number} value 速度倍率
 */
export async function speedLoop(enabled, value) {
	if (speedTimer) {
		clearTimeout(speedTimer)
		speedTimer = null
	}

	if (!enabled) {
		if (speedAddr) {
			// 关闭时把 B 恢复为 1.0
			writeSafe(speedAddr, 1.0, 'F32')
		}
		currentSpeed = 1.0
		return
	}

	if (typeof value === 'number' && !isNaN(value)) currentSpeed = value

	// 未找到地址 → 搜索（findSpeedAddr 内部有缓存）
	if (!speedAddr) {
		speedAddr = await findSpeedAddr()
		uni.showToast({
			icon: 'none',
			title: speedAddr ? '0x' + speedAddr.toString(16) : '未找到'
		})
		// console.log('全局加速 B 地址:', speedAddr ? '0x' + speedAddr.toString(16) : '未找到')
	}
	if (!speedAddr) {
		return
	}

	// ★ 直接写 speedAddr（就是 B）
	writeSafe(speedAddr, currentSpeed, 'F32')
	speedTimer = setTimeout(() => speedLoop(true), 100)
}

export function setSpeed(value) {
	if (typeof value !== 'number' || isNaN(value)) return
	currentSpeed = value
	if (speedAddr) {
		writeSafe(speedAddr, currentSpeed, 'F32')
	}
}

export function stopSpeedLoop() {
	if (speedTimer) {
		clearTimeout(speedTimer)
		speedTimer = null
	}
	if (speedAddr) {
		// ★ 恢复 B 为 1.0
		writeSafe(speedAddr, 1.0, 'F32')
	}
	// ★ 关键：不清 speedAddr，保留缓存！下次开启直接用
	currentSpeed = 1.0
}

/**
 * 清除加速 B 地址缓存
 * 用于：切换进程、场景重载、用户主动重新搜索
 */
export function clearSpeedAddr() {
	speedAddr = null
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
		// console.log('自燃炸花：已停止')
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
		// console.log('自燃炸花地址:', burnAddr ? '0x' + burnAddr.toString(16) : '未找到')
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
		// console.log('自动炸花：已停止')
		bloomState = {
			index: 0,
			coolDown: 0
		}
		return
	}
	if (!bloomAddr) {
		bloomAddr = await getPtr('zhuahua')
		uni.showToast({
			icon: 'none',
			title: bloomAddr ? '0x' + bloomAddr.toString(16) : '未找到'
		})
		// console.log('自动炸花地址:', bloomAddr ? '0x' + bloomAddr.toString(16) : '未找到')
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



// ================= 隐藏蜡烛（h5gg 搜索版） =================

const STEP = 0x80; // 每个蜡烛间隔
const TOTAL = 320; // 蜡烛数量
const BATCH_SIZE = 8; // 每批处理个数

// 缓存验证通过的蜡烛基址列表（避免重复搜索）
let candleBaseAddrs = null;

/**
 * 用 h5gg 搜索并验证蜡烛基址
 * 逻辑：
 *   1. 清空搜索结果
 *   2. 搜索 I32 == 1808480955 （0x6BCC0E7B）
 *   3. 遍历结果，只保留 I32 类型且值==1808480955 的
 *   4. 对每个地址，取该地址 I32 值 → 转 hex → 描述错位
 *      （实际上是读取该地址 + 4 字节的 I32 值）
 *   5. 判断该 I32 值是否为 25088 或 27136
 *   6. 通过则记录这个地址（Number）
 *
 * @returns {Promise<number[]>} 验证通过的地址列表
 */
let candleBaseAddrCache = null;

async function findCandleBaseAddrs() {
	// 缓存命中直接返回
	if (candleBaseAddrCache) {
		return candleBaseAddrCache;
	}

	if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
		// console.warn('[蜡烛] 无 h5gg 环境');
		return null;
	}

	try {
		h5gg.clearResults();
	} catch (e) { }
	try {
		h5gg.searchNumber('1808480955', 'I32', '0x130000000', '0x180000000');
	} catch (e) {
		// console.warn('[蜡烛] searchNumber 失败', e);
		return null;
	}

	await new Promise(r => setTimeout(r, 0));

	let results = [];
	try {
		const count = h5gg.getResultsCount();
		if (!count) return null;
		const raw = h5gg.getResults(count) || [];
		for (let i = 0; i < raw.length; i++) results.push(raw[i]);
	} catch (e) {
		// console.warn('[蜡烛] getResults 失败', e);
		return null;
	}

	for (let i = 0; i < results.length; i++) {
		const item = results[i];
		if (!item || !item.address || item.type !== 'I32') continue;

		let valAtAddr;
		try {
			valAtAddr = Number(h5gg.getValue(item.address, 'I32'));
		} catch (e) {
			continue;
		}
		if (valAtAddr !== 1808480955) continue;

		const nextAddrNum = Number(item.address);
		if (!Number.isFinite(nextAddrNum) || nextAddrNum <= 0) continue;

		const nextAddrHex = '0x' + (nextAddrNum + 4).toString(16);

		let nextVal;
		try {
			nextVal = Number(h5gg.getValue(nextAddrHex, 'I32'));
		} catch (e) {
			continue;
		}

		// ★ 关键修复：同时接受显示和隐藏状态的值
		if (nextVal === 25088 || nextVal === 27136 ||
			nextVal === 25608 || nextVal === 28673) {
			candleBaseAddrCache = nextAddrHex; // 缓存
			return nextAddrHex;
		}
	}

	return null;
}

export async function setCandleVisibility(visible) {
	try {
		const yclzaddr = await findCandleBaseAddrs();
		if (!yclzaddr) {
			// console.error('[蜡烛] 未找到有效地址');
			return false;
		}

		const base = Number(yclzaddr);
		if (!Number.isFinite(base) || base <= 0) {
			// console.error('[蜡烛] 地址无效:', yclzaddr);
			candleBaseAddrCache = null; // 清缓存重试
			return false;
		}

		const value = visible ? 25608 : 28673;
		// 用十六进制字符串地址，更规范
		for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
			const start = batch * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, TOTAL);
			for (let i = start; i < end; i++) {
				const addr = '0x' + (base - STEP * i).toString(16);
				h5gg.setValue(addr, value, 'I32');
			}
			if (batch % 4 === 0) {
				let d = 0;
				while (d < 1000) d++;
			}
		}
		// console.log('[蜡烛]', visible ? '显示' : '隐藏', '完成');
		return true;
	} catch (err) {
		// console.error('[setCandleVisibility] 出错:', err);
		candleBaseAddrCache = null;
		return false;
	}
}

export function clearCandleAddr() {
	candleBaseAddrCache = null;
}



// ================= 设置光翼数量（I32） =================
export async function setWingCount(value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false
	const addr = await getPtr('gysl')
	if (!addr || addr <= 0) return false
	return writeSafe(addr, v, 'I32')
}

// ================= 设置高度（F32） =================
export async function setGoldF32(value) {
	const v = parseFloat(value)
	if (!Number.isFinite(v)) return false
	const addr = await getPtr('goldF32')
	if (!addr || addr <= 0) return false
	return writeSafe(addr, v, 'F32')
}

// ================= 人物发光（F32） =================
export async function setPlayerGlow(value = 1.0) {
	const v = parseFloat(value)
	if (!Number.isFinite(v)) return false
	//先获取能量地址，通过偏移0x19AC获取发光地址,相差6572（十进制）
	const energyAddr = await getPtr('energy')  //先获取能量地址，通过偏移0x19AC获取发光地址,相差6572（十进制）
	if (!energyAddr || energyAddr <= 0) return false
	const glowAddr = energyAddr + 0x19AC
	if (!glowAddr || glowAddr <= 0) return false
	return writeSafe(glowAddr, v, 'F32')
}

// ================= 高危炸翼（I32，循环写入） =================
let wingBurstTimer = null
let wingBurstAddr = null
let wingBurstValue = 0

/**
 * 循环写入炸翼值
 * @param {boolean} checked 是否开启
 * @param {number} value 要写入的 I32 值
 * @param {number} interval 写入间隔 ms，默认 50
 */
export async function wingBurstLoop(checked, value, interval = 50) {
	// 先清旧定时器
	if (wingBurstTimer) {
		clearTimeout(wingBurstTimer)
		wingBurstTimer = null
	}

	if (!checked) {
		// 关闭：还原为 0
		if (wingBurstAddr) {
			writeSafe(wingBurstAddr, 0, 'I32')
		}
		wingBurstValue = 0
		return
	}

	// 缓存值
	const v = Number(value)
	if (!Number.isFinite(v)) return
	wingBurstValue = v

	// 未拿过地址 → 搜索一次
	if (!wingBurstAddr) {
		wingBurstAddr = await getPtr('zy')
		uni.showToast({
			icon: 'none',
			title: wingBurstAddr ? '0x' + wingBurstAddr.toString(16) : '未找到'
		})
	}
	if (!wingBurstAddr) return

	// 写一次
	writeSafe(wingBurstAddr, wingBurstValue, 'I32')
	// 循环
	wingBurstTimer = setTimeout(() => wingBurstLoop(true, wingBurstValue, interval), interval)
}

/**
 * 停止炸翼循环
 */
export function stopWingBurstLoop() {
	if (wingBurstTimer) {
		clearTimeout(wingBurstTimer)
		wingBurstTimer = null
	}
	if (wingBurstAddr) {
		writeSafe(wingBurstAddr, 0, 'I32')
	}
	// ★ 不清 wingBurstAddr，保留缓存
	wingBurstValue = 0
}

/**
 * 清除炸翼地址缓存
 */
export function clearWingBurstAddr() {
	wingBurstAddr = null
}





// ================= 大跳（滑块版） =================
let bigJumpAddr = null
let bigJumpTimer = null
let currentBigJump = 0

/**
 * 设置大跳值（滑块变化时调用）
 * @param {number} value 大跳倍率/数值
 */
export async function setBigJump(value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false

	currentBigJump = v

	if (!bigJumpAddr) {
		bigJumpAddr = await getPtr('bigjump')
		uni.showToast({
			icon: 'none',
			title: bigJumpAddr ? '0x' + bigJumpAddr.toString(16) : '未找到'
		})
	}
	if (!bigJumpAddr) return false

	return writeSafe(bigJumpAddr, v, 'F32')
}

/**
 * 大跳循环写入（可选，防止被游戏重置）
 * @param {boolean} enabled
 * @param {number} value
 */
export async function bigJumpLoop(enabled, value) {
	if (bigJumpTimer) {
		clearTimeout(bigJumpTimer)
		bigJumpTimer = null
	}
	if (!enabled) return

	const v = Number(value)
	if (Number.isFinite(v)) currentBigJump = v

	if (!bigJumpAddr) {
		bigJumpAddr = await getPtr('bigjump')
		uni.showToast({
			icon: 'none',
			title: bigJumpAddr ? '0x' + bigJumpAddr.toString(16) : '未找到'
		})
	}
	if (!bigJumpAddr) return

	writeSafe(bigJumpAddr, currentBigJump, 'F32')
	bigJumpTimer = setTimeout(() => bigJumpLoop(true, currentBigJump), 100)
}

/**
 * 停止大跳循环
 */
export function stopBigJumpLoop() {
	if (bigJumpTimer) {
		clearTimeout(bigJumpTimer)
		bigJumpTimer = null
	}
	// 保留 bigJumpAddr 缓存，下次直接用
	currentBigJump = 0
}

/**
 * 清除大跳地址缓存
 */
export function clearBigJumpAddr() {
	bigJumpAddr = null
}






// ================= 任意传送 =================
let warpCsdz = null // 缓存遇境路牌地址
let warpTimer = null // 传送状态轮询定时器
let originalWing = 0 // 记录原始光翼

/**
 * 将字符串前4字节转为小端 U32（I32）数值
 */
function strToHexLE(str) {
	const prefix = str.substring(0, 4)
	let hex = 0
	for (let i = 0; i < 4; i++) {
		const c = i < prefix.length ? prefix.charCodeAt(i) : 0
		hex |= (c & 0xFF) << (8 * i)
	}
	return hex >>> 0
}



/**
 * 写路牌字符串：先清零整个区域，再写新字符串，避免旧值残留
 * @param {number} addr 路牌地址
 * @param {string} str  目标 warpId，如 "Rain"
 * @param {number} maxLen 区域长度（默认 32，足够容纳最长 warpId）
 * @returns {boolean}
 */
function writeWarpSign(addr, str, maxLen = 32) {
	if (!addr || addr <= 0) return false
	const s = String(str || '')
	if (!s) return false
	try {
		// ① 先清零整个字符串区域（含 \0）
		for (let i = 0; i < maxLen; i++) {
			h5gg.setValue('0x' + (addr + i).toString(16), 0, 'U8')
		}

		// ② 逐字节写入新字符串
		const n = Math.min(s.length, maxLen - 1)   // 留 1 字节给 \0
		for (let i = 0; i < n; i++) {
			h5gg.setValue('0x' + (addr + i).toString(16), s.charCodeAt(i), 'U8')
		}

		// ③ 末尾补 \0（已清零，无需再写，但显式写更安全）
		h5gg.setValue('0x' + (addr + n).toString(16), 0, 'U8')

		return true
	} catch (e) {
		console.error('[传送] writeWarpSign 异常:', e)
		return false
	}
}


/**
 * 读地址的 U32，返回 0xXXXXXXXX 字符串（按 桶.html 的 readHexAt 原理）
 * @param {number} addrNum 地址（数字）
 * @returns {string|null} 如 "0x646E6143"，失败返回 null
 */
function readHexU32(addrNum) {
	if (!addrNum || addrNum <= 0) return null
	try {
		const addrStr = '0x' + addrNum.toString(16)
		const raw = h5gg.getValue(addrStr, 'U32')
		const num = Number(raw)
		if (!Number.isFinite(num)) return null
		return '0x' + (num >>> 0).toString(16).toUpperCase().padStart(8, '0')
	} catch (e) {
		return null
	}
}

/** 遇境路牌固定值：小端 "Cand" = CandleSpace 前 4 字节 */
const WARPS_CSDZ_HEX = '0x646E6143'

/**
 * 搜索并缓存遇境路牌地址 (特征码 1487508559 + 12 偏移)
 * 优化：
 *  1. 缓存命中时读 U32，必须 === 0x646E6143 才算有效，否则清缓存重搜
 *  2. 搜索结果遍历所有候选，逐个 +12 后读 U32 校验
 *  3. 第一个校验通过的直接缓存返回；全部失败返回 null
 */
async function findWarpCsdz() {
	// ★ 缓存校验：Hex 必须 === 0x646E6143
	if (warpCsdz) {
		const hex = readHexU32(warpCsdz)
		if (hex === WARPS_CSDZ_HEX) return warpCsdz
		console.log('[传送] 路牌缓存失效，Hex=' + hex + '，重新搜索')
		warpCsdz = null
	}

	h5gg.clearResults()
	h5gg.searchNumber('1487508559', 'I32', '0x130000000', '0x200000000')
	h5gg.searchNumber('1487508559', 'I32', '0x130000000', '0x200000000')
	const count = h5gg.getResultsCount()

	if (!count) {
		h5gg.clearResults()
		return null
	}

	const results = h5gg.getResults(count) || []
	console.log('[传送] 路牌特征码搜索结果共 ' + results.length + ' 条，逐个校验…')

	// ★ 遍历所有候选，逐个校验
	for (let i = 0; i < results.length; i++) {
		const item = results[i]
		if (!item || !item.address) continue

		const candidate = Number(item.address) + 12   // 路牌地址 = 特征地址 + 12
		const hex = readHexU32(candidate)

		if (hex === WARPS_CSDZ_HEX) {
			warpCsdz = candidate
			console.log('[传送] ✅ 路牌地址有效: 0x' + candidate.toString(16) +
				' (' + hex + ')，第 ' + (i + 1) + '/' + results.length + ' 条')
			h5gg.clearResults()
			return warpCsdz
		}
		// 不匹配的候选直接跳过，不打印（避免刷屏）
	}

	// ★ 全部候选校验失败 → 清空缓存
	console.log('[传送] ❌ 全部 ' + results.length + ' 条候选均未通过 Hex 校验')
	warpCsdz = null
	h5gg.clearResults()
	return null
}




// 反向查找：英文名 -> I32 地图ID
// 反向查找：英文名 -> I32；找不到再用中文名兜底
function findMapI32ByName(engName, zhName) {
	const cfg = map_point()
	const table = cfg.rycs_id || {}

	// 1. 英文 warpId 精确匹配
	for (const key in table) {
		if (table[key].name === engName) return Number(key)
	}

	// 2. 中文名兜底：先别名，再原名，再 mapIdToName 反查
	if (zhName) {
		const stdZh = zhAlias[zhName] || zhName
		const zhToI32 = {}
		for (const [i32, zh] of Object.entries(mapIdToName)) zhToI32[zh] = i32
		if (zhToI32[stdZh] !== undefined) return Number(zhToI32[stdZh])
	}

	return null
}

let warping = false

/**
 * @param {string} targetMapId 英文 warpId，如 "Dawn"
 * @param {string} [targetZhName] 中文名，如 "晨岛"（用于兜底反查）
 */
export async function executeWarp(targetMapId, targetZhName) {

	if (warping) {
		// uni.showToast({ icon: 'none', title: '传送进行中，请稍候' })
		return { success: false, reason: 'busy' }
	}

	// 1. 反查目标 I32
	const targetMapI32 = findMapI32ByName(targetMapId, targetZhName)
	if (targetMapI32 === null) {
		uni.showToast({ icon: 'none', title: '未知地图: ' + targetMapId })
		return { success: false, reason: 'unknown-map' }
	}

	warping = true
	try {
		// if (!await initMapCore()) throw new Error('地图核心初始化失败')
		const csAddress = await findWarpCsdz()
		if (!csAddress) throw new Error('未找到遇境路牌地址')


		// const currentMapI32 = Number(h5gg.getValue(currentMapIdAddr, 'I32'))
		// 获取能量地址，先转成十六进制，然后偏移-420，就是当前地图ID的地址，然后获取这个地址对应ID，类型是I32
		// 1. 拿 I64 字符串（getPtr 返回 I64）
		const energyRaw = await getPtr('energy')
		if (!energyRaw) throw new Error('能量地址无效')

		// 2. 转 BigInt（兼容 "0x..." 和 "123456789" 两种格式）
		const energyBig = typeof energyRaw === 'bigint'
			? energyRaw
			: BigInt(String(energyRaw).trim())

		// 3. 转十六进制字符串（BigInt.toString(16) 不丢精度）
		// const energyHex = energyBig.toString(16)
		// console.log('[传送] energy I64 =', energyRaw, ' hex = 0x' + energyHex)

		// 4. 地址 - 420 字节（BigInt 运算，不丢精度）
		const mapIdBig = energyBig - 420n
		const mapIdAddrHex = '0x' + mapIdBig.toString(16)

		// console.log('[传送] mapIdAddr =', mapIdAddrHex, '(energy - 420)')

		// 5. 读该地址的 I32 = 当前地图 ID
		const currentMapI32 = Number(h5gg.getValue(mapIdAddrHex, 'I32'))
		// console.log('[传送] currentMapI32 =', currentMapI32, ' target =', targetMapI32)


		// alert('当前地图ID: ' + currentMapI32 + ', 目标地图ID: ' + targetMapI32)


		if (currentMapI32 === targetMapI32) {
			uni.showToast({ icon: 'none', title: '已在目标地图' })
			return { success: true, reason: 'already-there' }
		}

		const wingAddr = await getPtr('gysl')
		if (wingAddr) {
			originalWing = Number(h5gg.getValue('0x' + wingAddr.toString(16), 'I32'))
		}

		const r = strToHexLE(targetMapId)
		console.log(r)
		// 4. 写路牌
		writeWarpSign(csAddress, targetMapId, 32)
		console.log('[传送] 写后字符串:', readStringAt(csAddress, 32))

		// 5. 光翼置 0 + 加速
		if (wingAddr) writeSafe(wingAddr, 0, 'I32')
		await speedLoop(true, 10.0)

		// 6. 轮询
		const result = await new Promise(resolve => {
			let tries = 0
			const MAX_TRIES = 15
			const timer = setInterval(() => {
				tries++
				const cur = Number(h5gg.getValue(mapIdAddrHex, 'I32'))   // ★ 用 mapIdAddrHex
				if (cur === targetMapI32) {
					clearInterval(timer)
					resolve({ success: true })
				} else if (tries >= MAX_TRIES) {
					clearInterval(timer)
					resolve({ success: false, reason: 'timeout', lastMapI32: cur })
				}
			}, 1000)
		})

		// 7. 恢复
		if (wingAddr) writeSafe(wingAddr, originalWing, 'I32')
		writeWarpSign(csAddress, 'CandleSpace', 32)
		stopSpeedLoop()

		if (result.success) {
			uni.showToast({ icon: 'none', title: '传送成功' })
		} else {
			uni.showToast({ icon: 'none', title: '传送超时，已恢复' })
		}
		return result
	} catch (e) {
		try { writeSafe(await findWarpCsdz(), strToHexLE('CandleSpace'), 'U32') } catch (_) { }
		stopSpeedLoop()
		uni.showToast({ icon: 'none', title: '传送失败' })
		return { success: false, reason: 'error', message: e.message }
	} finally {
		warping = false
	}
}






/**
 * 清除传送地址缓存
 */
export function clearWarpAddr() {
	warpCsdz = null
}







// ================= 地图核心初始化 =================
let mapCoreAddr = null; // 缓存地图核心地址 (lzdz)
let currentMapIdAddr = null; // 缓存当前地图ID的地址

/**
 * 初始化地图核心地址和当前地图ID地址
 * 逻辑模仿 Lua 脚本：
 * 1. 搜索特征码 3267887104 (QWORD)
 * 2. 在 (特征码地址 - 8) 处寻找一个值为 1 的 DWORD
 * 3. 如果找到，则地图核心地址 = (该DWORD地址) - 48
 * 4. 当前地图ID地址 = 地图核心地址 + 8849904
 * @returns {Promise<boolean>} 初始化是否成功
 */
export async function initMapCore() {
	if (mapCoreAddr && currentMapIdAddr) {
		// 如果已经初始化过，先验证一下地址是否还有效
		try {
			const testMapId = Number(h5gg.getValue(currentMapIdAddr, 'I32'));
			if (Number.isFinite(testMapId)) {
				return true; // 缓存有效，直接返回
			}
		} catch (e) {
			// 地址失效，继续下面的初始化流程
		}
	}

	h5gg.clearResults();
	// 1. 搜索特征码
	h5gg.searchNumber('3267887104', 'I64', '0x130000000', '0x180000000');
	const count = h5gg.getResultsCount();
	if (count === 0) {
		console.error('[地图核心] 未找到特征码 3267887104，初始化失败。');
		h5gg.clearResults();
		return false;
	}

	const results = h5gg.getResults(count);
	let foundBlock = false;

	// 2. 遍历结果，寻找数据块
	for (const item of results) {
		// 数据块基地址 = 特征码地址 - 8
		const blockBaseAddr = item.address - 8;

		// 读取该基地址的 DWORD 值，判断是否为 1
		const checkAddr = '0x' + blockBaseAddr.toString(16);
		const blockValue = Number(h5gg.getValue(checkAddr, 'I32'));

		if (blockValue === 1) {
			// 3. 计算地图核心地址 (lzdz)
			mapCoreAddr = blockBaseAddr - 48;
			// 4. 计算当前地图ID地址
			currentMapIdAddr = '0x' + (mapCoreAddr + 8849904).toString(16);
			foundBlock = true;
			console.log(`[地图核心] 初始化成功！核心地址: 0x${mapCoreAddr.toString(16)}, 地图ID地址: ${currentMapIdAddr}`);
			break;
		}
	}

	h5gg.clearResults();

	if (!foundBlock) {
		console.error('[地图核心] 未找到有效的数据块，初始化失败。');
		mapCoreAddr = null;
		currentMapIdAddr = null;
		return false;
	}

	return true;
}

/**
 * 清除地图核心缓存
 */
export function clearMapCore() {
	mapCoreAddr = null;
	currentMapIdAddr = null;
}








/** 清所有功能地址缓存，配置更新后调用 */
export function clearAllAddrCache() {
	energyAddr = null
	speedAddr = null
	burnAddr = null
	bloomAddr = null
	fireworkAddr = null
	candleBaseAddrs = null
	bigJumpAddr = null
	clearMapCore()
	clearWarpAddr()
}
