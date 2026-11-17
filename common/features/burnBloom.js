// common/features/burnBloom.js
// 自燃 / 炸花 / 吸火 / 隐藏蜡烛

import { customDelay, writeSafe } from '../h5gg.js'
import { setAddr } from '../addressRegistry.js'

// ================= 自燃 / 炸花 =================
const SLICE_PER_LOOP = 4
const LOOP_DELAY = 10
const BURN_MAX = 512
const BURN_STEP = 464
const BLOOM_MAX = 512
const BLOOM_STEP = 8

let burnTimer = null
let bloomTimer = null
let burnAddr = null
let bloomAddr = null

let burnState = { index: 0, coolDown: 0 }
let bloomState = { index: 0, coolDown: 0 }

export async function burnLoop(enabled) {
    if (burnTimer) {
        clearTimeout(burnTimer)
        burnTimer = null
    }
    if (!enabled) {
        burnState = { index: 0, coolDown: 0 }
        return
    }

    if (!burnAddr) {
        const ok = searchBurnAddr()
        if (!ok) {
            uni.showToast({ icon: 'none', title: '自燃未找到地址' })
            return
        }
        burnState.index = 0
        setAddr('burnAddr', burnAddr, { type: 'BASE' })
    } else {
        try {
            const test = h5gg.getValue('0x' + burnAddr.toString(16), 'F32')
            if (test === undefined || test === null) {
                burnAddr = null
                const ok = searchBurnAddr()
                if (!ok) {
                    uni.showToast({ icon: 'none', title: '自燃地址失效，未找到新地址' })
                    return
                }
                burnState.index = 0
                setAddr('burnAddr', burnAddr, { type: 'BASE' })
            }
        } catch (e) {
            burnAddr = null
            const ok = searchBurnAddr()
            if (!ok) {
                uni.showToast({ icon: 'none', title: '自燃地址失效，未找到新地址' })
                return
            }
            burnState.index = 0
            setAddr('burnAddr', burnAddr, { type: 'BASE' })
        }
    }

    if (burnAddr > 0) {
        const start = burnState.index
        const end = Math.min(start + SLICE_PER_LOOP, BURN_MAX)
        for (let j = start; j < end; j++) {
            try { h5gg.setValue(burnAddr + BURN_STEP * j, 1, 'F32') } catch (e) { }
        }
        burnState.index = (end >= BURN_MAX) ? 0 : end
    }

    burnTimer = setTimeout(() => burnLoop(true), LOOP_DELAY)
}

function searchBurnAddr() {
    try {
        h5gg.clearResults()
        h5gg.searchNumber('1026180643', 'I32', '0x130000000', '0x170000000')
        h5gg.searchNumber('1026180643', 'I32', '0x130000000', '0x170000000')
        const cnt = h5gg.getResultsCount()
        if (cnt === 0) {
            h5gg.clearResults()
            return false
        }
        const results = h5gg.getResults(cnt)
        if (!results || results.length === 0) {
            h5gg.clearResults()
            return false
        }
        for (let i = 0; i < results.length; i++) {
            const addrNum = Number(results[i].address)
            const v20 = Number(h5gg.getValue(addrNum + 20, 'I16'))
            const v72 = Number(h5gg.getValue(addrNum + 72, 'F32'))
            if (v20 === -13107 && v72 === -100) {
                burnAddr = addrNum + 8
                h5gg.clearResults()
                return true
            }
        }
        h5gg.clearResults()
        return false
    } catch (e) {
        try { h5gg.clearResults() } catch (_) { }
        return false
    }
}

let zrzhBaseAddr = 0

function searchOneZhahua() {
    try {
        h5gg.clearResults()
        h5gg.searchNumber('1133903872', 'I32', '0x130000000', '0x170000000')
        h5gg.searchNumber('1133903872', 'I32', '0x130000000', '0x170000000')
        h5gg.searchNearby('12884901888', 'I64', '0x8')
        h5gg.searchNumber('12884901888', 'I64', '0x130000000', '0x170000000')
        const cnt = h5gg.getResultsCount()
        if (cnt === 0) {
            h5gg.clearResults()
            return false
        }
        const results = h5gg.getResults(cnt)
        if (!results || results.length === 0) {
            h5gg.clearResults()
            return false
        }
        for (let i = 0; i < results.length; i++) {
            const addrNum = Number(results[i].address)
            const v4 = Number(h5gg.getValue(addrNum + 4, 'I32'))
            const v8 = Number(h5gg.getValue(addrNum + 8, 'I64'))
            const v1420 = Number(h5gg.getValue(addrNum + 1420, 'F64'))
            if (v4 === 3 && v8 === 1133903872 && v1420 === 0.0078125) {
                zrzhBaseAddr = addrNum + 16
                return zrzhBaseAddr
            }
        }
        h5gg.clearResults()
        return true
    } catch (e) {
        return false
    }
}

let bloomGen = 0

export async function bloomLoop(enabled) {
    const gen = ++bloomGen
    if (bloomTimer) { clearTimeout(bloomTimer); bloomTimer = null }
    if (!enabled) {
        bloomState = { index: 0, coolDown: 0 }
        return
    }

    if (!bloomAddr) {
        const addr = searchOneZhahua()
        if (gen !== bloomGen) return
        if (!(addr > 0)) {
            uni.showToast({ icon: 'none', title: '炸花未找到地址' })
            return
        }
        bloomAddr = addr
        bloomState.index = 0
        setAddr('bloomAddr', bloomAddr, { type: 'BASE' })
        uni.showToast({ icon: 'none', title: '0x' + addr.toString(16) })
    } else {
        let valid = false
        try {
            const test = h5gg.getValue('0x' + bloomAddr.toString(16), 'F32')
            if (test !== undefined && test !== null) valid = true
        } catch (e) { }

        if (!valid) {
            bloomAddr = null
            const addr = searchOneZhahua()
            if (gen !== bloomGen) return
            if (!(addr > 0)) {
                uni.showToast({ icon: 'none', title: '炸花地址失效，未找到新地址' })
                return
            }
            bloomAddr = addr
            bloomState.index = 0
            setAddr('bloomAddr', bloomAddr, { type: 'BASE' })
            uni.showToast({ icon: 'none', title: '0x' + addr.toString(16) })
        }
    }

    if (bloomAddr > 0) {
        const start = bloomState.index
        const end = Math.min(start + SLICE_PER_LOOP, BLOOM_MAX)
        for (let j = start; j < end; j++) {
            try { h5gg.setValue(bloomAddr + BLOOM_STEP * j, 0, 'F32') } catch (e) { }
        }
        bloomState.index = (end >= BLOOM_MAX) ? 0 : end
    }

    if (gen !== bloomGen) return
    bloomTimer = setTimeout(() => bloomLoop(true), LOOP_DELAY)
}

export function stopBurnLoop() {
    if (burnTimer) {
        clearTimeout(burnTimer)
        burnTimer = null
    }
    burnState = { index: 0, coolDown: 0 }
}

export function stopBloomLoop() {
    if (bloomTimer) {
        clearTimeout(bloomTimer)
        bloomTimer = null
    }
    bloomState = { index: 0, coolDown: 0 }
}

// ================= 吸火 =================
let xihuoTimer = null
let xihuoRunning = false

export async function xihuoOnce() {
    if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
        return false
    }

    try {
        h5gg.clearResults()
        h5gg.searchNumber('3.5', 'F32', '0x110000000', '0x2000000000')
        h5gg.searchNearby('-1', 'F32', '0x60')
        h5gg.searchNumber('3.5', 'F32', '0x00000000', '0x2000000000')
        const count = h5gg.getResultsCount()
        if (!count) {
            h5gg.clearResults()
            return false
        }
        h5gg.editAll('1000000000', 'F32')
        await customDelay(0)
        h5gg.clearResults()
        return true
    } catch (e) {
        try { h5gg.clearResults() } catch (_) { }
        return false
    }
}

let xihuoToastInited = false
let xihuoLastOk = null

export async function xihuoLoop(enabled) {
    if (xihuoTimer) {
        clearTimeout(xihuoTimer)
        xihuoTimer = null
    }
    if (!enabled) {
        xihuoRunning = false
        xihuoToastInited = false
        xihuoLastOk = null
        return
    }

    xihuoRunning = true
    const wrote = xihuoOnce()

    if (xihuoLastOk !== wrote) {
        xihuoLastOk = wrote
        if (wrote) {
            uni.showToast({ icon: 'none', title: '已吸取当前地图烛火' })
        } else if (!xihuoToastInited) {
            uni.showToast({ icon: 'none', title: '附近没有可吸取的烛火' })
        }
        xihuoToastInited = true
    }

    if (!xihuoRunning) return
}

export function stopXihuoLoop() {
    if (xihuoTimer) {
        clearTimeout(xihuoTimer)
        xihuoTimer = null
    }
    xihuoRunning = false
}

// ================= 隐藏蜡烛 =================
const STEP = 0x80
const TOTAL = 320
const BATCH_SIZE = 8

let candleBaseAddrCache = null

async function findCandleBaseAddrs() {
    if (candleBaseAddrCache) {
        try {
            const v = Number(h5gg.getValue(candleBaseAddrCache, 'I32'))
            if (Number.isFinite(v)) return candleBaseAddrCache
        } catch (e) { }
        candleBaseAddrCache = null
    }

    if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
        return null
    }

    try { h5gg.clearResults() } catch (e) { }
    try {
        h5gg.searchNumber('1808480955', 'I32', '0x130000000', '0x180000000')
    } catch (e) {
        return null
    }

    await new Promise(r => setTimeout(r, 0))

    let results = []
    try {
        const count = h5gg.getResultsCount()
        if (!count) return null
        const raw = h5gg.getResults(count) || []
        for (let i = 0; i < raw.length; i++) results.push(raw[i])
    } catch (e) {
        return null
    }

    for (let i = 0; i < results.length; i++) {
        const item = results[i]
        if (!item || !item.address || item.type !== 'I32') continue

        let valAtAddr
        try {
            valAtAddr = Number(h5gg.getValue(item.address, 'I32'))
        } catch (e) {
            continue
        }
        if (valAtAddr !== 1808480955) continue

        const nextAddrNum = Number(item.address)
        if (!Number.isFinite(nextAddrNum) || nextAddrNum <= 0) continue

        const nextAddrHex = '0x' + (nextAddrNum + 4).toString(16)

        let nextVal
        try {
            nextVal = Number(h5gg.getValue(nextAddrHex, 'I32'))
        } catch (e) {
            continue
        }

        if (nextVal === 25088 || nextVal === 27136 ||
            nextVal === 25608 || nextVal === 28673) {
            candleBaseAddrCache = nextAddrHex
            setAddr('candleAddr', nextAddrHex, { type: 'BASE' })
            return nextAddrHex
        }
    }

    return null
}

export async function setCandleVisibility(visible) {
    try {
        const yclzaddr = await findCandleBaseAddrs()
        if (!yclzaddr) return false

        const base = Number(yclzaddr)
        if (!Number.isFinite(base) || base <= 0) {
            candleBaseAddrCache = null
            return false
        }

        const value = visible ? 25608 : 28673
        for (let batch = 0; batch < Math.ceil(TOTAL / BATCH_SIZE); batch++) {
            const start = batch * BATCH_SIZE
            const end = Math.min(start + BATCH_SIZE, TOTAL)
            for (let i = start; i < end; i++) {
                const addr = '0x' + (base - STEP * i).toString(16)
                h5gg.setValue(addr, value, 'I32')
            }
            if (batch % 4 === 0) {
                let d = 0
                while (d < 1000) d++
            }
        }
        return true
    } catch (err) {
        candleBaseAddrCache = null
        return false
    }
}

export function clearCandleAddr() {
    candleBaseAddrCache = null
}

// ================= 供 index.js 统一清理 =================
export function clearBurnBloomCaches() {
    burnAddr = null
    bloomAddr = null
    candleBaseAddrCache = null
}
