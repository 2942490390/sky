// common/energyShield.js
// 能量盾核心逻辑（移植自 HTML 版），支持 8 人 × 3 类独立开关

// ================= 常量 =================
const NLD_FEATURE_VALUE = '0.544388'
const NLD_SEARCH_FROM = '0x120000000'
const NLD_SEARCH_TO = '0x1600000000'
const NLD_PLAYER_STEP = 0x2B8E0
const NLD_OFFSET_MAIN = 0xE8      // 能量盾
const NLD_OFFSET_OTHER = 0x120    // 它人视角炸盾
const NLD_OFFSET_SELF = 276       // 自身视角炸盾（0x114）
const NLD_INTERVAL_MAIN = 200
const NLD_INTERVAL_OTHER = 1
const NLD_INTERVAL_SELF = 500
const NLD_PLAYER_COUNT = 8

// ================= 模块状态 =================
let nldBaseAddr = null
let nldAddrList = null      // 能量盾地址 [8]
let nldOtherList = null     // 它人炸地址 [8]
let nldSelfList = null      // 自身炸地址 [8]

// 每类每人的定时器
let nldTimers = new Array(NLD_PLAYER_COUNT).fill(null)
let nldOtherTimers = new Array(NLD_PLAYER_COUNT).fill(null)
let nldSelfTimers = new Array(NLD_PLAYER_COUNT).fill(null)

// 每类每人的开关状态
let nldState = new Array(NLD_PLAYER_COUNT).fill(false)
let nldOtherState = new Array(NLD_PLAYER_COUNT).fill(false)
let nldSelfState = new Array(NLD_PLAYER_COUNT).fill(false)

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
export function initEnergyShield() {
    try {
        // ★ 先停掉所有旧定时器 + 重置缓存，避免旧地址残留
        stopAllEnergyShield()
        nldBaseAddr = null
        nldAddrList = null
        nldOtherList = null
        nldSelfList = null

        if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
            return false
        }

        h5gg.clearResults()
        h5gg.searchNumber(NLD_FEATURE_VALUE, 'F32', NLD_SEARCH_FROM, NLD_SEARCH_TO)

        const cnt = h5gg.getResultsCount()
        if (!cnt) {
            h5gg.clearResults()
            return false
        }

        const baseAddr = Number(h5gg.getResults(1)[0].address)
        h5gg.clearResults()

        if (!baseAddr || !Number.isFinite(baseAddr)) return false

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

        return true
    } catch (e) {
        return false
    }
}

export function isInitialized() {
    return !!(nldAddrList && nldOtherList && nldSelfList)
}

// ================= 单个开关控制 =================
/**
 * 控制某一类某一玩家的开关
 * @param {'main'|'other'|'self'} type
 * @param {number} playerIndex 0~7
 * @param {boolean} enabled
 */
export function setEnergyShield(type, playerIndex, enabled) {
    if (playerIndex < 0 || playerIndex >= NLD_PLAYER_COUNT) return false

    // 未初始化则尝试初始化
    if (!isInitialized()) {
        if (!initEnergyShield()) return false
    }

    const map = {
        main: { list: nldAddrList, timers: nldTimers, state: nldState, interval: NLD_INTERVAL_MAIN },
        other: { list: nldOtherList, timers: nldOtherTimers, state: nldOtherState, interval: NLD_INTERVAL_OTHER },
        self: { list: nldSelfList, timers: nldSelfTimers, state: nldSelfState, interval: NLD_INTERVAL_SELF }
    }
    const cfg = map[type]
    if (!cfg) return false

    const addr = cfg.list[playerIndex]
    if (!addr || addr <= 0) return false

    // 先关闭旧的
    if (cfg.timers[playerIndex]) {
        clearInterval(cfg.timers[playerIndex])
        cfg.timers[playerIndex] = null
    }

    if (enabled) {
        cfg.state[playerIndex] = true
        cfg.timers[playerIndex] = setInterval(() => {
            try {
                writeSafe(addr, 1, 'F32')
            } catch (e) {
                clearInterval(cfg.timers[playerIndex])
                cfg.timers[playerIndex] = null
                cfg.state[playerIndex] = false
            }
        }, cfg.interval)
    } else {
        cfg.state[playerIndex] = false
    }

    return true
}

// ================= 批量 / 全部控制 =================
export function setAllEnergyShield(type, enabled) {
    for (let i = 0; i < NLD_PLAYER_COUNT; i++) {
        setEnergyShield(type, i, enabled)
    }
}

export function stopAllEnergyShield() {
    const allTimers = [nldTimers, nldOtherTimers, nldSelfTimers]
    for (const arr of allTimers) {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i]) {
                clearInterval(arr[i])
                arr[i] = null
            }
        }
    }
    nldState.fill(false)
    nldOtherState.fill(false)
    nldSelfState.fill(false)
}

// ================= 查询状态 =================
export function getState(type, playerIndex) {
    if (playerIndex < 0 || playerIndex >= NLD_PLAYER_COUNT) return false
    if (type === 'main') return nldState[playerIndex]
    if (type === 'other') return nldOtherState[playerIndex]
    if (type === 'self') return nldSelfState[playerIndex]
    return false
}

export function getAllStates() {
    return {
        main: nldState.slice(),
        other: nldOtherState.slice(),
        self: nldSelfState.slice()
    }
}

// ================= 地址查询（开发者页用） =================

/**
 * 获取基准地址
 */
export function getBaseAddr() {
    return nldBaseAddr
}

/**
 * 获取能量盾地址列表（长度 8，可能含 null）
 */
export function getMainAddrList() {
    return nldAddrList ? nldAddrList.slice() : new Array(NLD_PLAYER_COUNT).fill(null)
}

/**
 * 获取它人炸地址列表（长度 8）
 */
export function getOtherAddrList() {
    return nldOtherList ? nldOtherList.slice() : new Array(NLD_PLAYER_COUNT).fill(null)
}

/**
 * 获取自身炸地址列表（长度 8）
 */
export function getSelfAddrList() {
    return nldSelfList ? nldSelfList.slice() : new Array(NLD_PLAYER_COUNT).fill(null)
}

/**
 * 格式化地址 → '0x...' 或 '-'
 */
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
export function resetEnergyShield() {
    stopAllEnergyShield()
    nldBaseAddr = null
    nldAddrList = null
    nldOtherList = null
    nldSelfList = null
}