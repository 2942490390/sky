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
	} catch (e) {}
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





// ================= 能量盾（全局 8 人） =================
// 原 HTML 逻辑：
//   1. 搜索特征值 0.544388 (F32)
//   2. 取第一个结果作为 baseAddr
//   3. 每个玩家间隔 0x2B8E0
//   4. 能量盾   = cAddr - 0xE8
//      它人炸盾 = cAddr - 0x120
//      自身炸盾 = baseAddr - 0x114（276）
//   5. 三个类型写入间隔不同：200 / 1 / 500 ms

const NLD_FEATURE_VALUE = '0.544388'
const NLD_SEARCH_FROM = '0x120000000'
const NLD_SEARCH_TO = '0x1600000000'
const NLD_PLAYER_STEP = 0x2B8E0
const NLD_OFFSET_MAIN = 0xE8 // 能量盾
const NLD_OFFSET_OTHER = 0x120 // 它人视角炸盾
const NLD_OFFSET_SELF = 276 // 自身视角炸盾（0x114）
const NLD_INTERVAL_MAIN = 200
const NLD_INTERVAL_OTHER = 1
const NLD_INTERVAL_SELF = 500
const NLD_PLAYER_COUNT = 8

// 模块级状态
let nldBaseAddr = null
let nldAddrList = null // 能量盾地址 [8]
let nldOtherList = null // 它人炸地址 [8]
let nldSelfList = null // 自身炸地址 [8]
let nldTimers = null // 能量盾定时器 [8]
let nldOtherTimers = null // 它人炸定时器 [8]
let nldSelfTimers = null // 自身炸定时器 [8]

/**
 * 初始化能量盾地址（搜索特征值 + 计算 8 个玩家 3 类地址）
 * @returns {boolean}
 */
export function initEnergyShield() {
	try {
		if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
			// console.warn('[能量盾] 无 h5gg 环境')
			return false
		}

		h5gg.clearResults()
		h5gg.searchNumber(NLD_FEATURE_VALUE, 'F32', NLD_SEARCH_FROM, NLD_SEARCH_TO)

		const cnt = h5gg.getResultsCount()
		if (!cnt) {
			// console.warn('[能量盾] 未搜索到特征值', NLD_FEATURE_VALUE)
			h5gg.clearResults()
			return false
		}

		const baseAddr = Number(h5gg.getResults(1)[0].address)
		h5gg.clearResults()

		if (!baseAddr || !Number.isFinite(baseAddr)) {
			// console.warn('[能量盾] baseAddr 非法')
			return false
		}

		nldBaseAddr = baseAddr
		nldAddrList = new Array(NLD_PLAYER_COUNT)
		nldOtherList = new Array(NLD_PLAYER_COUNT)
		nldSelfList = new Array(NLD_PLAYER_COUNT)

		// 能量盾 / 它人炸
		let cAddr = baseAddr
		for (let i = 0; i < NLD_PLAYER_COUNT; i++) {
			if (i > 0) cAddr += NLD_PLAYER_STEP
			nldAddrList[i] = cAddr - NLD_OFFSET_MAIN
			nldOtherList[i] = cAddr - NLD_OFFSET_OTHER
		}

		// 自身炸
		let selfAddr = baseAddr - NLD_OFFSET_SELF
		for (let i = 0; i < NLD_PLAYER_COUNT; i++) {
			if (i > 0) selfAddr += NLD_PLAYER_STEP
			nldSelfList[i] = selfAddr
		}

		// console.log('[能量盾] baseAddr = 0x' + baseAddr.toString(16))
		// console.log('[能量盾] 能量盾地址 =', nldAddrList.map(a => '0x' + a.toString(16)))
		// console.log('[能量盾] 它人炸地址 =', nldOtherList.map(a => '0x' + a.toString(16)))
		// console.log('[能量盾] 自身炸地址 =', nldSelfList.map(a => '0x' + a.toString(16)))

		return true
	} catch (e) {
		// console.warn('[能量盾] 初始化异常', e)
		return false
	}
}

/**
 * 清理全部能量盾定时器
 */
export function stopEnergyShieldLoop() {
	if (nldTimers) {
		for (let i = 0; i < nldTimers.length; i++) {
			if (nldTimers[i]) {
				clearInterval(nldTimers[i]);
				nldTimers[i] = null
			}
		}
	}
	if (nldOtherTimers) {
		for (let i = 0; i < nldOtherTimers.length; i++) {
			if (nldOtherTimers[i]) {
				clearInterval(nldOtherTimers[i]);
				nldOtherTimers[i] = null
			}
		}
	}
	if (nldSelfTimers) {
		for (let i = 0; i < nldSelfTimers.length; i++) {
			if (nldSelfTimers[i]) {
				clearInterval(nldSelfTimers[i]);
				nldSelfTimers[i] = null
			}
		}
	}
	nldTimers = null
	nldOtherTimers = null
	nldSelfTimers = null
}

/**
 * 开启 / 关闭能量盾
 * @param {boolean} checked
 * @returns {Promise<boolean>} 操作是否成功
 */
export async function energyShieldLoop(checked) {
	// 先清掉旧的
	stopEnergyShieldLoop()

	if (!checked) {
		// console.log('[能量盾] 已关闭')
		return true
	}

	// 未初始化 → 初始化
	if (!nldAddrList || !nldOtherList || !nldSelfList) {
		const ok = initEnergyShield()
		if (!ok) {
			// console.warn('[能量盾] 初始化失败，无法开启')
			return false
		}
	}

	nldTimers = new Array(NLD_PLAYER_COUNT)
	nldOtherTimers = new Array(NLD_PLAYER_COUNT)
	nldSelfTimers = new Array(NLD_PLAYER_COUNT)

	for (let i = 0; i < NLD_PLAYER_COUNT; i++) {
		// 能量盾
		const a1 = nldAddrList[i]
		if (a1) {
			nldTimers[i] = setInterval(() => {
				try {
					writeSafe(a1, 1, 'F32')
				} catch (e) {}
			}, NLD_INTERVAL_MAIN)
		}

		// 它人炸
		const a2 = nldOtherList[i]
		if (a2) {
			nldOtherTimers[i] = setInterval(() => {
				try {
					writeSafe(a2, 1, 'F32')
				} catch (e) {}
			}, NLD_INTERVAL_OTHER)
		}

		// 自身炸
		const a3 = nldSelfList[i]
		if (a3) {
			nldSelfTimers[i] = setInterval(() => {
				try {
					writeSafe(a3, 1, 'F32')
				} catch (e) {}
			}, NLD_INTERVAL_SELF)
		}
	}

	// console.log('[能量盾] 已开启，8 个玩家 × 3 类')
	return true
}

/**
 * 重置能量盾缓存（切换进程 / 重载配置后调用）
 */
export function resetEnergyShield() {
	stopEnergyShieldLoop()
	nldBaseAddr = null
	nldAddrList = null
	nldOtherList = null
	nldSelfList = null
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

// ================= 高危炸翼（I32） =================
export async function setWingBurst(value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false
	const addr = await getPtr('zy')
	if (!addr || addr <= 0) return false
	return writeSafe(addr, v, 'I32')
}









/** 清所有功能地址缓存，配置更新后调用 */
export function clearAllAddrCache() {
	energyAddr = null
	speedAddr = null
	burnAddr = null
	bloomAddr = null
	fireworkAddr = null
	candleBaseAddrs = null
}