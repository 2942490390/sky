// common/features/warp.js
// 任意传送 / 地图核心

import { getPtr, writeSafe } from '../h5gg.js'
import { setAddr } from '../addressRegistry.js'
import { map_point, mapIdToName, zhAlias } from '../getMapPoint.js'
import { speedLoop, stopSpeedLoop } from './energy.js'

// ================= 通用 =================
let warpCsdz = null
let originalWing = 0

function strToHexLE(str) {
    const prefix = str.substring(0, 4)
    let hex = 0
    for (let i = 0; i < 4; i++) {
        const c = i < prefix.length ? prefix.charCodeAt(i) : 0
        hex |= (c & 0xFF) << (8 * i)
    }
    return hex >>> 0
}

function writeWarpSign(addr, str, maxLen = 32) {
    if (!addr || addr <= 0) return false
    const s = String(str || '')
    if (!s) return false
    try {
        for (let i = 0; i < maxLen; i++) {
            h5gg.setValue('0x' + (addr + i).toString(16), 0, 'U8')
        }
        const n = Math.min(s.length, maxLen - 1)
        for (let i = 0; i < n; i++) {
            h5gg.setValue('0x' + (addr + i).toString(16), s.charCodeAt(i), 'U8')
        }
        h5gg.setValue('0x' + (addr + n).toString(16), 0, 'U8')
        return true
    } catch (e) {
        console.error('[传送] writeWarpSign 异常:', e)
        return false
    }
}

export function readHexU32(addrNum) {
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

const WARPS_CSDZ_HEX = '0x646E6143'

async function findWarpCsdz() {
    if (warpCsdz) {
        const hex = readHexU32(warpCsdz)
        if (hex === WARPS_CSDZ_HEX) return warpCsdz
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

    for (let i = 0; i < results.length; i++) {
        const item = results[i]
        if (!item || !item.address) continue

        const candidate = Number(item.address) + 12
        const hex = readHexU32(candidate)

        if (hex === WARPS_CSDZ_HEX) {
            warpCsdz = candidate
            console.log('[传送] ✅ 路牌地址有效: 0x' + candidate.toString(16) +
                ' (' + hex + ')，第 ' + (i + 1) + '/' + results.length + ' 条')
            h5gg.clearResults()
            return warpCsdz
        }
    }

    warpCsdz = null
    h5gg.clearResults()
    return null
}

function findMapI32ByName(engName, zhName) {
    const cfg = map_point()
    const table = cfg.rycs_id || {}

    for (const key in table) {
        if (table[key].name === engName) return Number(key)
    }

    if (zhName) {
        const stdZh = zhAlias[zhName] || zhName
        const zhToI32 = {}
        for (const [i32, zh] of Object.entries(mapIdToName)) zhToI32[zh] = i32
        if (zhToI32[stdZh] !== undefined) return Number(zhToI32[stdZh])
    }

    return null
}

let warping = false

export async function executeWarp(targetMapId, targetZhName) {
    if (warping) {
        return { success: false, reason: 'busy' }
    }

    const targetMapI32 = findMapI32ByName(targetMapId, targetZhName)
    if (targetMapI32 === null) {
        uni.showToast({ icon: 'none', title: '未知地图: ' + targetMapId })
        return { success: false, reason: 'unknown-map' }
    }

    warping = true
    try {
        if (!await initMapCore()) throw new Error('地图核心初始化失败')
        const csAddress = await findWarpCsdz()
        if (!csAddress) throw new Error('未找到遇境路牌地址')

        setAddr('warpCsdz', csAddress, { type: 'HEX' })

        const rwdzRaw = await getPtr('rwdz')
        if (!rwdzRaw) throw new Error('人物地址无效')

        const rwdzBig = typeof rwdzRaw === 'bigint' ?
            rwdzRaw :
            BigInt(String(rwdzRaw).trim())

        const mapIdBig = rwdzBig + 24812n
        const mapIdAddrHex = '0x' + mapIdBig.toString(16)

        const currentMapI32 = Number(h5gg.getValue(mapIdAddrHex, 'I32'))
        setAddr('mapId', mapIdAddrHex, { type: 'I32', value: currentMapI32 })

        uni.showToast({ icon: 'none', title: '当前地图ID' + currentMapI32 })

        if (currentMapI32 === targetMapI32) {
            uni.showToast({ icon: 'none', title: '已在目标地图' })
            return { success: true, reason: 'already-there' }
        }

        const wingAddr = await getPtr('gysl')
        if (wingAddr) {
            originalWing = Number(h5gg.getValue('0x' + wingAddr.toString(16), 'I32'))
        }

        writeWarpSign(csAddress, targetMapId, 32)

        if (wingAddr) writeSafe(wingAddr, 0, 'I32')
        await speedLoop(true, 10.0)

        const result = await new Promise(resolve => {
            let tries = 0
            const MAX_TRIES = 15
            const timer = setInterval(() => {
                tries++
                const cur = Number(h5gg.getValue(mapIdAddrHex, 'I32'))
                if (cur === targetMapI32) {
                    clearInterval(timer)
                    resolve({ success: true })
                } else if (tries >= MAX_TRIES) {
                    clearInterval(timer)
                    resolve({ success: false, reason: 'timeout', lastMapI32: cur })
                }
            }, 1000)
        })

        if (wingAddr) writeSafe(wingAddr, originalWing, 'I32')
        writeWarpSign(csAddress, 'CandleSpace', 32)
        stopSpeedLoop()

        return result
    } catch (e) {
        try {
            writeSafe(await findWarpCsdz(), strToHexLE('CandleSpace'), 'U32')
        } catch (_) { }
        stopSpeedLoop()
        uni.showToast({ icon: 'none', title: '传送失败' })
        return { success: false, reason: 'error', message: e.message }
    } finally {
        warping = false
    }
}

export function clearWarpAddr() {
    warpCsdz = null
}

// ================= 地图核心 =================
let mapCoreAddr = null
let currentMapIdAddr = null

export async function initMapCore() {
    if (mapCoreAddr && currentMapIdAddr) {
        try {
            const testMapId = Number(h5gg.getValue(currentMapIdAddr, 'I32'))
            if (Number.isFinite(testMapId)) return true
        } catch (e) { }
    }

    h5gg.clearResults()
    h5gg.searchNumber('3267887104', 'I64', '0x130000000', '0x180000000')
    const count = h5gg.getResultsCount()
    if (count === 0) {
        h5gg.clearResults()
        return false
    }

    const results = h5gg.getResults(count)
    let foundBlock = false

    for (const item of results) {
        const blockBaseAddr = item.address - 8
        const checkAddr = '0x' + blockBaseAddr.toString(16)
        const blockValue = Number(h5gg.getValue(checkAddr, 'I32'))

        if (blockValue === 1) {
            mapCoreAddr = blockBaseAddr - 48
            currentMapIdAddr = '0x' + (mapCoreAddr + 8849904).toString(16)
            foundBlock = true
            setAddr('mapCore', mapCoreAddr, { type: 'BASE' })
            console.log(`[地图核心] 初始化成功！核心地址: 0x${mapCoreAddr.toString(16)}, 地图ID地址: ${currentMapIdAddr}`)
            break
        }
    }

    h5gg.clearResults()

    if (!foundBlock) {
        console.error('[地图核心] 未找到有效的数据块，初始化失败。')
        mapCoreAddr = null
        currentMapIdAddr = null
        return false
    }

    return true
}

export function clearMapCore() {
    mapCoreAddr = null
    currentMapIdAddr = null
}

// ============================================================
// 任意门（AnyDoor）实现 —— 严格对齐 Lua 原始脚本
// Lua writeString 布局：
//   addr + 0       = 30           （头部标记）
//   addr + 1 ~ N   = 关卡名字符串
//   addr + N+1     = 0            （\0 结尾）
//   写前清 24 字节
//   rym = BaseAddr + 4
//   字符串区 = rym + 0x2C
//   标志1   = rym + 18420 = 80
//   标志2   = rym + 0x60  = -1
// ============================================================

const AD_SEARCH_VALUE = '1141201306'
const AD_STR_OFFSET = 0x2C
const AD_FLAG1_OFFSET = 18420
const AD_FLAG2_OFFSET = 0x60
const AD_FLAG1_VALUE = 80
const AD_FLAG2_VALUE = -1
const AD_STR_CLEAR_LEN = 24
const AD_STR_MAX_LEN = 23
const AD_HEAD_BYTE = 30

let adRym = null
let adStrAddr = null
let adFlag1Addr = null
let adFlag2Addr = null
let adInited = false

// 严格照搬 Lua writeString，预构造后连续写入
function adWriteString(addr, str) {
    if (!addr || addr <= 0) return false
    const s = String(str || '')
    if (!s) return false
    try {
        // 预构造 24 字节
        const buf = new Array(AD_STR_CLEAR_LEN).fill(0)
        buf[0] = AD_HEAD_BYTE
        const limit = s.substring(0, AD_STR_MAX_LEN)
        for (let i = 0; i < limit.length; i++) {
            buf[1 + i] = limit.charCodeAt(i) & 0xFF
        }
        buf[1 + limit.length] = 0

        // 连续写入，中间不夹读/计算
        for (let i = 0; i < buf.length; i++) {
            h5gg.setValue('0x' + (addr + i).toString(16), buf[i], 'U8')
        }
        return true
    } catch (e) {
        console.error('[任意门] adWriteString 异常:', e)
        return false
    }
}

// 自适应读字符串：从 addr+0 开始，跳过前导不可打印字节
// 兼容两种布局：
//   1) addr+0=30, addr+1='S'...     （脚本刚写完）
//   2) addr+0='S',  addr+1='u'...   （游戏左移后）
function adReadString(addr) {
    if (!addr || addr <= 0) return ''
    try {
        // 读 24 字节原始数据
        const raw = []
        for (let i = 0; i < AD_STR_CLEAR_LEN; i++) {
            raw.push(Number(h5gg.getValue('0x' + (addr + i).toString(16), 'U8')))
        }
        // 找第一个可打印 ASCII 起点（0x20~0x7E）
        let start = -1
        for (let i = 0; i < raw.length; i++) {
            if (raw[i] >= 0x20 && raw[i] <= 0x7E) {
                start = i
                break
            }
        }
        if (start < 0) return ''
        // 从 start 读到 \0 或不可打印
        let out = ''
        for (let i = start; i < raw.length; i++) {
            const b = raw[i]
            if (b === 0 || b < 0x20 || b > 0x7E) break
            out += String.fromCharCode(b)
        }
        return out
    } catch (e) { }
    return ''
}

// 只用特征码定位，全内存搜（范围保持你原来的，已验证没问题）
function adLocateBySignature() {
    try {
        h5gg.clearResults()
        h5gg.searchNumber(AD_SEARCH_VALUE, 'I32', '0x100000000', '0x200000000')
        const count = h5gg.getResultsCount()
        console.log('[任意门] 特征码搜索结果数:', count)
        if (!count) {
            h5gg.clearResults()
            return false
        }

        const results = h5gg.getResults(count) || []
        h5gg.clearResults()
        if (!results.length) return false

        // 遍历所有结果，选字符串区看起来像关卡名的
        let chosen = null
        for (let i = 0; i < results.length; i++) {
            const baseAddr = Number(results[i].address)
            if (!baseAddr || baseAddr <= 0) continue

            const testRym = baseAddr + 4
            const testStr = testRym + AD_STR_OFFSET

            // 读 addr+0 起 24 字节原始数据
            let sample = ''
            try {
                const raw = []
                for (let j = 0; j < AD_STR_CLEAR_LEN; j++) {
                    raw.push(Number(h5gg.getValue('0x' + (testStr + j).toString(16), 'U8')))
                }
                let start = -1
                for (let j = 0; j < raw.length; j++) {
                    if (raw[j] >= 0x20 && raw[j] <= 0x7E) { start = j; break }
                }
                if (start >= 0) {
                    for (let j = start; j < raw.length; j++) {
                        const b = raw[j]
                        if (b === 0 || b < 0x20 || b > 0x7E) break
                        sample += String.fromCharCode(b)
                    }
                }
            } catch (e) { continue }

            const isMapName = /^[A-Za-z0-9_]{2,23}$/.test(sample)
            console.log(`[任意门] 候选 ${i + 1}/${results.length}: baseAddr=0x${baseAddr.toString(16)}, 字符串="${sample}", 像关卡名=${isMapName}`)

            if (isMapName) {
                chosen = { baseAddr, sample }
                break
            }
        }

        if (!chosen) {
            console.warn('[任意门] 所有候选的字符串区都不像关卡名')
            return false
        }

        adRym = chosen.baseAddr + 4
        adStrAddr = adRym + AD_STR_OFFSET
        adFlag1Addr = adRym + AD_FLAG1_OFFSET
        adFlag2Addr = adRym + AD_FLAG2_OFFSET

        console.log('[任意门] 选定 baseAddr=0x' + chosen.baseAddr.toString(16) +
            ', rym=0x' + adRym.toString(16) +
            ', str=0x' + adStrAddr.toString(16) +
            ', flag1=0x' + adFlag1Addr.toString(16) +
            ', flag2=0x' + adFlag2Addr.toString(16) +
            ', 当前字符串="' + chosen.sample + '"')
        return true
    } catch (e) {
        console.error('[任意门] 特征码定位异常:', e)
        try { h5gg.clearResults() } catch (_) { }
        return false
    }
}

export async function initAnyDoor() {
    if (adInited && adRym && adStrAddr) {
        try {
            Number(h5gg.getValue('0x' + adFlag1Addr.toString(16), 'I32'))
            return true
        } catch (e) { adInited = false }
    }

    const ok = adLocateBySignature()
    adInited = ok
    if (ok) {
        setAddr('anyDoorRym', adRym, { type: 'BASE' })
        setAddr('anyDoorStr', adStrAddr, { type: 'STR' })
    }
    return ok
}

export async function goMapAnyDoor(code) {
    if (!code || typeof code !== 'string') {
        return { success: false, reason: 'bad-arg' }
    }
    if (!/^[A-Za-z0-9_]+$/.test(code)) {
        return { success: false, reason: 'bad-code' }
    }
    if (code.length > AD_STR_MAX_LEN) {
        return { success: false, reason: 'code-too-long', maxLen: AD_STR_MAX_LEN, input: code.length }
    }

    if (!await initAnyDoor()) {
        return { success: false, reason: 'init-failed' }
    }

    try {
        // 写前记录
        const before = adReadString(adStrAddr)
        console.log('[任意门] 写前字符串="' + before + '"')

        // 1) 写字符串
        if (!adWriteString(adStrAddr, code)) {
            return { success: false, reason: 'write-string-failed' }
        }
        const afterWrite = adReadString(adStrAddr)
        console.log('[任意门] 写后立即读="' + afterWrite + '" (期望="' + code + '")')

        if (afterWrite !== code) {
            console.warn('[任意门] ⚠️ 写后读回不匹配，可能是游戏瞬间改写。继续写标志...')
        }

        // 2) 先写标志2（参数），再写标志1（触发）
        const addr1Hex = '0x' + adFlag1Addr.toString(16)
        const addr2Hex = '0x' + adFlag2Addr.toString(16)
        h5gg.setValue(addr2Hex, AD_FLAG2_VALUE, 'I32')
        h5gg.setValue(addr1Hex, AD_FLAG1_VALUE, 'I32')

        // 3) 读回标志
        const f1 = Number(h5gg.getValue(addr1Hex, 'I32'))
        const f2 = Number(h5gg.getValue(addr2Hex, 'I32'))
        console.log('[任意门] 标志回读: flag1=' + f1 + ', flag2=' + f2)

        return {
            success: true,
            writtenCode: afterWrite,
            flag1: f1,
            flag2: f2
        }
    } catch (e) {
        console.error('[任意门] goMapAnyDoor 异常:', e)
        return { success: false, reason: 'exception', message: e.message }
    }
}

export function writeAnyDoorCode(code) {
    if (!adInited || !adStrAddr) return false
    return adWriteString(adStrAddr, code)
}

export function triggerAnyDoor() {
    if (!adInited || !adFlag1Addr || !adFlag2Addr) return false
    try {
        // 先标志2，再标志1
        h5gg.setValue('0x' + adFlag2Addr.toString(16), AD_FLAG2_VALUE, 'I32')
        h5gg.setValue('0x' + adFlag1Addr.toString(16), AD_FLAG1_VALUE, 'I32')
        return true
    } catch (e) { return false }
}

export function readCurrentAnyDoorCode() {
    if (!adInited || !adStrAddr) return ''
    return adReadString(adStrAddr)
}

export function clearAnyDoorCache() {
    adRym = null
    adStrAddr = null
    adFlag1Addr = null
    adFlag2Addr = null
    adInited = false
}

// ================= 供 index.js 统一清理 =================
export function clearWarpCaches() {
    warpCsdz = null
    mapCoreAddr = null
    currentMapIdAddr = null
    clearAnyDoorCache()
}
