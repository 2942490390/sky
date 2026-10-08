// common/magic.js
// 特征魔法核心逻辑（移植自魔法.html）

// ================= 常量 =================
const SEARCH_FROM = '0x100000000'
const SEARCH_TO = '0x1600000000'

// 槽位偏移
const SLOT_COUNT = 8
const SLOT_STEP = 0x38          // 每个槽间隔
const OFFSET_ID = 0x24          // id   = sw1 - 0x24
const OFFSET_TIME = 0x14        // time = sw1 - 0x14

// 开关值
const SWITCH_ON = 0             // 开启时写 0
const SWITCH_OFF = 257          // 关闭时写 257

// 魔法时间
const TIME_ON = -1
const TIME_OFF = 0

// 卡槽数量值
const COUNT_ANY_ON = 9
const COUNT_ALL_OFF = 0

// ================= 模块状态 =================
let Magic = {}                  // { 1: {id, time, switchAddr}, ... 8 }
let magicCountAddr = null       // 卡槽数量地址
let inited = false

// 每槽状态：null 或 item.id
let slotState = {
	1: null, 2: null, 3: null, 4: null,
	5: null, 6: null, 7: null, 8: null
}

// ================= 工具 =================
function writeSafe(addrNum, val, type) {
	if (!addrNum || addrNum <= 0) return false
	try {
		h5gg.setValue('0x' + addrNum.toString(16), val, type)
		return true
	} catch (e) {
		return false
	}
}

// ================= 初始化 =================
export function initMagic() {
	try {
		if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
			return false
		}

		// ★ 先清空旧状态
		resetMagic()

		// ---------- 1. 搜索槽位基准 ----------
		h5gg.clearResults()
		h5gg.searchNumber('17843', 'I32', SEARCH_FROM, SEARCH_TO)
		if (h5gg.getResultsCount() === 0) {
			h5gg.clearResults()
			return false
		}

		h5gg.searchNearby('257', 'I32', '0x100')
		if (h5gg.getResultsCount() === 0) {
			h5gg.clearResults()
			return false
		}

		h5gg.searchNumber('257', 'I32', SEARCH_FROM, SEARCH_TO)
		const c3 = h5gg.getResultsCount()
		if (c3 === 0) {
			h5gg.clearResults()
			return false
		}

		const sw1 = Number(h5gg.getResults(1)[0].address)
		h5gg.clearResults()

		if (!sw1 || !Number.isFinite(sw1)) return false

		const id1 = sw1 - OFFSET_ID
		const time1 = sw1 - OFFSET_TIME

		Magic = {}
		for (let i = 1; i <= SLOT_COUNT; i++) {
			const off = (i - 1) * SLOT_STEP
			Magic[i] = {
				id: id1 + off,
				time: time1 + off,
				switchAddr: sw1 + off
			}
		}

		// ---------- 2. 搜索卡槽数量地址 ----------
		h5gg.clearResults()
		h5gg.searchNumber('2035109393', 'I32', SEARCH_FROM, SEARCH_TO)
		h5gg.searchNearby('307', 'I32', '0x100')
		h5gg.searchNumber('307', 'I32', SEARCH_FROM, SEARCH_TO)

		const cnt = h5gg.getResultsCount()
		if (cnt > 0) {
			const res = h5gg.getResults(cnt)
			for (let j = 0; j < res.length; j++) {
				const addr307 = Number(res[j].address)
				const verifyAddr = addr307 - 64
				try {
					if (Number(h5gg.getValue('0x' + verifyAddr.toString(16), 'I32')) === 1) {
						magicCountAddr = verifyAddr - 8
						break
					}
				} catch (e) {}
			}
		}
		h5gg.clearResults()

		inited = true
		return true
	} catch (e) {
		return false
	}
}

export function isMagicInitialized() {
	return inited
}

// ================= 开关单个槽 =================
/**
 * 切换某个槽的魔法
 * @param {number} slot 1~8
 * @param {object} item {name, id}
 * @returns {boolean}
 */
export function toggleMagic(slot, item) {
	if (!inited || !Magic[slot]) return false
	if (!item || item.id === undefined) return false

	const m = Magic[slot]
	const isSame = slotState[slot] === item.id

	if (isSame) {
		// 关闭
		slotState[slot] = null
		writeSafe(m.id, 0, 'I32')
		writeSafe(m.time, TIME_OFF, 'I32')
		writeSafe(m.switchAddr, SWITCH_OFF, 'I32')
	} else {
		// 开启
		slotState[slot] = item.id
		writeSafe(m.id, item.id, 'I32')
		writeSafe(m.time, TIME_ON, 'I32')
		writeSafe(m.switchAddr, SWITCH_ON, 'I32')
	}

	// 更新卡槽数量
	if (magicCountAddr) {
		let anyOn = false
		for (let s = 1; s <= SLOT_COUNT; s++) {
			if (slotState[s] !== null) {
				anyOn = true
				break
			}
		}
		writeSafe(magicCountAddr, anyOn ? COUNT_ANY_ON : COUNT_ALL_OFF, 'I32')
	}

	return true
}

// ================= 关闭所有槽 =================
export function closeAllMagic() {
	if (!inited) return
	for (let s = 1; s <= SLOT_COUNT; s++) {
		if (!Magic[s]) continue
		writeSafe(Magic[s].id, 0, 'I32')
		writeSafe(Magic[s].time, TIME_OFF, 'I32')
		writeSafe(Magic[s].switchAddr, SWITCH_OFF, 'I32')
		slotState[s] = null
	}
	if (magicCountAddr) {
		writeSafe(magicCountAddr, COUNT_ALL_OFF, 'I32')
	}
}

// ================= 查询状态 =================
export function getSlotState() {
	return { ...slotState }
}

export function isSlotOn(slot, itemId) {
	return slotState[slot] === itemId
}

// ================= 地址查询（开发者页用） =================
export function getMagicAddrList() {
	const list = []
	for (let i = 1; i <= SLOT_COUNT; i++) {
		if (Magic[i]) {
			list.push({
				slot: i,
				id: Magic[i].id,
				time: Magic[i].time,
				switchAddr: Magic[i].switchAddr
			})
		} else {
			list.push({ slot: i, id: null, time: null, switchAddr: null })
		}
	}
	return list
}

export function getMagicCountAddr() {
	return magicCountAddr
}

export function fmtAddr(addr) {
	if (addr === null || addr === undefined) return '-'
	const n = Number(addr)
	if (!Number.isFinite(n) || n <= 0) return '-'
	try {
		return '0x' + n.toString(16)
	} catch (e) {
		return '-'
	}
}

// ================= 重置 =================
export function resetMagic() {
	Magic = {}
	magicCountAddr = null
	inited = false
	for (let s = 1; s <= SLOT_COUNT; s++) slotState[s] = null
}