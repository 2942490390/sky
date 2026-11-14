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

/**
 * 查找传送路牌地址的异步函数
 * @returns {Promise<number|null>} 返回找到的路牌地址，如果未找到则返回null
 */
async function findWarpCsdz() {
    // 如果已经缓存了warpCsdz地址，先验证其有效性
    if (warpCsdz) {
        // 读取32位十六进制值
        const hex = readHexU32(warpCsdz)
        // 如果匹配预期的路牌十六进制值，直接返回缓存地址
        if (hex === WARPS_CSDZ_HEX) return warpCsdz
        // 不匹配则清除缓存
        warpCsdz = null
    }

    // 清空搜索结果
    h5gg.clearResults()
    // 在指定内存范围内搜索特定数值（路牌标识）
    h5gg.searchNumber('1487508559', 'I32', '0x130000000', '0x200000000')
    // 再次搜索以确保结果准确
    h5gg.searchNumber('1487508559', 'I32', '0x130000000', '0x200000000')
    // 获取搜索结果数量
    const count = h5gg.getResultsCount()

    // 如果没有找到任何结果，清空搜索结果并返回null
    if (!count) {
        h5gg.clearResults()
        return null
    }

    // 获取所有搜索结果
    const results = h5gg.getResults(count) || []

    // 遍历搜索结果
    for (let i = 0; i < results.length; i++) {
        const item = results[i]
        // 跳过无效结果
        if (!item || !item.address) continue

        // 计算候选地址（偏移12字节）
        const candidate = Number(item.address) + 12
        // 读取候选地址的32位十六进制值
        const hex = readHexU32(candidate)

        // 如果找到匹配的路牌十六进制值
        if (hex === WARPS_CSDZ_HEX) {
            // 缓存有效地址
            warpCsdz = candidate
            // 输出找到路牌的日志信息
            console.log('[传送] ✅ 路牌地址有效: 0x' + candidate.toString(16) +
                ' (' + hex + ')，第 ' + (i + 1) + '/' + results.length + ' 条')
            // 清空搜索结果并返回地址
            h5gg.clearResults()
            return warpCsdz
        }
    }

    // 未找到有效路牌地址，清除缓存并返回null
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
        const mapIdAddrHex = '0x' + mapIdBig.toString(16) // 地图ID地址

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
// 任意门（AnyDoor）实现
// 特征码随地图不同而不同，用 AD_MAP_SIGNATURES 维护映射
//   → 首次搜索：按当前地图 ID 选特征码，搜到后缓存地址
//   → 缓存后：后续传送不再检查地图，直接用缓存地址
// ============================================================

const AD_STR_OFFSET = 0x2C // 传送字符串地址偏移
const AD_FLAG1_OFFSET = 18420 // 传送标志1地址偏移
const AD_FLAG2_OFFSET = 0x60 // 传送标志2地址偏移
const AD_FLAG1_VALUE = 80 // 传送标志1的值（表示传送请求已发出）
const AD_FLAG2_VALUE = -1 // 传送标志2的值（表示传送已完成）
const AD_STR_CLEAR_LEN = 24 // 传送字符串清空长度（字节数）
const AD_STR_MAX_LEN = 31 // 传送字符串最大长度（字节数）
const AD_RWDZ_MAPID_OFFSET = 24812n // X地址中地图 ID 地址偏移

// ---- 地图特征码表 ----
// key: 地图 I32（与 mapIdToName 的 key 一致）
// value: 该地图下可搜到的特征码
const AD_MAP_SIGNATURES = {
    '-768833570': '1141201306',   // 遇境
    '1509719447': '-1040239821',          // 云巢（待补特征码）
    '-389882442': '1137190502',           // 公寓（待补特征码）
    // 后续按同样格式追加：
    // '地图I32': '特征码',
}

// 已补特征码的地图名（用于日志）
const AD_MAP_NAMES = {
    '-768833570': '遇境',
    '-1040239821': '云巢',
    '1137190502': '公寓',
}

let adRymAddr = null
let adRym = null
let adStrAddr = null
let adFlag1Addr = null
let adFlag2Addr = null
let adInited = false
let adCurrentMapId = null   // 缓存时所在的地图 ID，用于日志/调试

// ---- 读当前地图 ID ----
/**
 * 获取当前地图信息的异步函数
 * 该函数通过读取内存中的地址来获取当前地图的ID、名称和签名
 * @returns {Object} 返回包含地图信息的对象，包含id、name、sig和addr属性
 */
async function adGetCurrentMap() {
    try {
        // 获取人物地址的原始值
        const rwdzRaw = await getPtr('rwdz')
        // 如果人物地址无效，返回未知地图信息
        if (!rwdzRaw) {
            return { id: null, name: '未知（人物地址无效）', sig: null }
        }
        // 将地址值转换为BigInt类型
        const rwdzBig = typeof rwdzRaw === 'bigint'
            ? rwdzRaw
            : BigInt(String(rwdzRaw).trim())
        // 计算地图ID的内存地址偏移
        const mapIdBig = rwdzBig + AD_RWDZ_MAPID_OFFSET
        // 将地址转换为十六进制字符串格式
        const mapIdAddrHex = '0x' + mapIdBig.toString(16)
        // 从内存中读取当前地图ID
        const curMapId = Number(h5gg.getValue(mapIdAddrHex, 'I32'))

        // ★ 注册"当前地图ID"（数值）
        setAddr('mapId', mapIdAddrHex, { type: 'I32' })

        // ★ 注册"当前地图名"（字符串，由 ID 映射，不走内存读）
        const curMapName = mapIdToName[String(curMapId)] || ('未知(' + curMapId + ')')
        setAddr('mapName', mapIdAddrHex, {
            type: 'STRING',
            derive: (getValueFn) => {
                const id = Number(getValueFn(mapIdAddrHex, 'I32'))
                return mapIdToName[String(id)] || ('未知(' + id + ')')
            }
        })
        // 获取当前地图的签名，如果找不到则为null
        const sig = AD_MAP_SIGNATURES[String(curMapId)] || null
        // 返回包含完整地图信息的对象
        return { id: curMapId, name: curMapName, sig, addr: mapIdAddrHex }
    } catch (e) {
        // 捕获并处理可能的异常，返回错误信息
        console.error('[任意门] 读当前地图异常:', e)
        return { id: null, name: '读取异常', sig: null, addr: null }
    }
}

function adWriteString(addr, str) {
    if (!addr || addr <= 0) return false
    const s = String(str || '')
    if (!s) return false
    try {
        for (let i = 0; i < AD_STR_CLEAR_LEN; i++) {
            h5gg.setValue('0x' + (addr + i).toString(16), 0, 'U8')
        }
        const limit = s.substring(0, AD_STR_MAX_LEN)
        for (let i = 0; i < limit.length; i++) {
            h5gg.setValue('0x' + (addr + i).toString(16), limit.charCodeAt(i) & 0xFF, 'U8')
        }
        h5gg.setValue('0x' + (addr + limit.length).toString(16), 0, 'U8')
        return true
    } catch (e) {
        console.error('[任意门] adWriteString 异常:', e)
        return false
    }
}

/**
 * 从指定地址读取字符串
 * @param {number} addr - 要读取的内存地址
 * @returns {string} - 返回读取到的字符串，如果读取失败则返回空字符串
 */
function adReadString(addr) {
    // 检查地址是否有效
    if (!addr || addr <= 0) return ''
    try {
        // 创建一个数组用于存储原始数据
        const raw = []
        // 循环读取指定长度的数据
        for (let i = 0; i < AD_STR_CLEAR_LEN; i++) {
            // 将地址转换为十六进制，并读取一个U8类型的数据
            raw.push(Number(h5gg.getValue('0x' + (addr + i).toString(16), 'U8')))
        }
        // 初始化起始位置为-1
        let start = -1
        // 查找第一个可打印字符的位置
        for (let i = 0; i < raw.length; i++) {
            if (raw[i] >= 0x20 && raw[i] <= 0x7E) { start = i; break }
        }
        if (start < 0) return ''
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

// 用指定特征码定位，返回是否成功
/**
 * 根据特征码定位游戏中的特定地址
 * @param {number} searchValue - 要搜索的特征码值
 * @returns {boolean} 是否成功定位到有效地址
 */
function adLocateBySignature(searchValue) {
    try {
        // 清空之前的搜索结果，确保搜索环境干净
        h5gg.clearResults()
        // 在指定内存范围内搜索特征码
        h5gg.searchNumber(searchValue, 'I32', '0x130000000', '0x200000000')
        // 获取搜索结果的数量
        const count = h5gg.getResultsCount()
        console.log('[任意门] 特征码 ' + searchValue + ' 搜索结果数:', count)
        // 如果没有搜索到结果，清空结果并返回false
        if (!count) {
            h5gg.clearResults()
            return false
        }
        // 获取所有搜索结果
        const results = h5gg.getResults(count) || []
        h5gg.clearResults()
        // 如果结果为空，返回false
        if (!results.length) return false

        let chosen = null
        // 遍历所有搜索结果
        for (let i = 0; i < results.length; i++) {
            // 获取基础地址
            const baseAddr = Number(results[i].address)
            // 检查地址是否有效
            if (!baseAddr || baseAddr <= 0) continue

            // 计算测试地址和字符串地址
            const testRym = baseAddr + 4
            const testStr = testRym + AD_STR_OFFSET

            let sample = ''
            try {
                // 读取字符串数据
                const raw = []
                for (let j = 0; j < AD_STR_CLEAR_LEN; j++) {
                    raw.push(Number(h5gg.getValue('0x' + (testStr + j).toString(16), 'U8')))
                }
                let start = -1 // 查找第一个可打印字符的位置
                for (let j = 0; j < raw.length; j++) {
                    // 如果字符在可打印范围内，则记录起始位置
                    if (raw[j] >= 0x20 && raw[j] <= 0x7E) { start = j; break }
                }
                if (start >= 0) {
                    for (let j = start; j < raw.length; j++) {
                        const b = raw[j]
                        // 如果字符是空字符或不可打印字符，则停止读取
                        if (b === 0 || b < 0x20 || b > 0x7E) break
                        sample += String.fromCharCode(b)
                    }
                }
            } catch (e) { continue }

            const isMapName = /^[A-Za-z0-9_]{2,31}$/.test(sample) // 检查字符串是否为关卡名
            console.log(`[任意门] 候选 ${i + 1}/${results.length}: baseAddr=0x${baseAddr.toString(16)}, 字符串="${sample}", 像关卡名=${isMapName}`)

            if (isMapName) {
                chosen = { baseAddr, sample }
                break
            }
        }

        if (!chosen) {
            console.warn('[任意门] 特征码 ' + searchValue + ' 的所有候选都不像关卡名')
            return false
        }
        adRymAddr = chosen.baseAddr
        adRym = chosen.baseAddr + 4 // 读取随机数地址
        adStrAddr = adRym + AD_STR_OFFSET // 读取字符串地址
        adFlag1Addr = adRym + AD_FLAG1_OFFSET // 读取标志1地址
        adFlag2Addr = adRym + AD_FLAG2_OFFSET // 读取标志2地址

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

// 初始化：
//   已有缓存 → 直接返回 true，不检查地图
//   无缓存   → 读当前地图 → 查特征码表 → 有则搜并缓存
export async function initAnyDoor() {
    if (adInited && adRym && adStrAddr) {
        try {
            Number(h5gg.getValue('0x' + adFlag1Addr.toString(16), 'I32'))
            return true
        } catch (e) {
            console.warn('[任意门] 缓存地址失效，需要重新搜索')
            adInited = false
        }
    }

    // 读当前地图，查特征码表
    const cur = await adGetCurrentMap()
    if (!cur.id) {
        console.warn('[任意门] 无法读取当前地图，初始化失败')
        return false
    }
    console.log('[任意门] 当前地图: ' + cur.name + ' (I32=' + cur.id + ')' + ', 地址= ' + (cur.addr || '未知'))

    if (cur.sig === null) {
        console.warn('[任意门] 当前地图「' + cur.name + '」暂未配置特征码，无法初始化')
        return false
    }

    const ok = adLocateBySignature(cur.sig)
    adInited = ok
    if (ok) {
        adCurrentMapId = cur.id
        setAddr('任意门特征码', adRymAddr, { type: 'I32' })
        setAddr('任意门字符串', adStrAddr, { type: 'STR' })
        console.log('[任意门] 缓存成功，来源地图: ' + cur.name)
    }
    return ok
}

// 传送：有缓存直接用，不再检查地图
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
        const before = adReadString(adStrAddr)
        console.log('[任意门] 写前字符串="' + before + '"')

        if (!adWriteString(adStrAddr, code)) {
            return { success: false, reason: 'write-string-failed' }
        }
        const afterWrite = adReadString(adStrAddr)
        console.log('[任意门] 写后立即读="' + afterWrite + '" (期望="' + code + '")')

        if (afterWrite !== code) {
            console.warn('[任意门] ⚠️ 写后读回不匹配，继续写标志...')
        }

        const addr1Hex = '0x' + adFlag1Addr.toString(16)
        const addr2Hex = '0x' + adFlag2Addr.toString(16)
        h5gg.setValue(addr2Hex, AD_FLAG2_VALUE, 'I32')
        h5gg.setValue(addr1Hex, AD_FLAG1_VALUE, 'I32')

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
        h5gg.setValue('0x' + adFlag2Addr.toString(16), AD_FLAG2_VALUE, 'I32')
        h5gg.setValue('0x' + adFlag1Addr.toString(16), AD_FLAG1_VALUE, 'I32')
        return true
    } catch (e) { return false }
}

export function readCurrentAnyDoorCode() {
    if (!adInited || !adStrAddr) return ''
    return adReadString(adStrAddr)
}

export function getAnyDoorCacheStatus() {
    return {
        inited: adInited,
        hasCache: !!(adInited && adRym && adStrAddr),
        sourceMapId: adCurrentMapId,
        sourceMapName: adCurrentMapId != null
            ? (AD_MAP_NAMES[String(adCurrentMapId)] || mapIdToName[String(adCurrentMapId)] || String(adCurrentMapId))
            : null
    }
}

export function clearAnyDoorCache() {
    adRym = null
    adStrAddr = null
    adFlag1Addr = null
    adFlag2Addr = null
    adInited = false
    adCurrentMapId = null
}

// ================= 供 index.js 统一清理 =================
export function clearWarpCaches() {
    warpCsdz = null
    mapCoreAddr = null
    currentMapIdAddr = null
    clearAnyDoorCache()
}