// common/features/warp.js
// 任意传送 / 地图核心

import { getPtr, writeSafe, waitForOffsetsReady } from '../h5gg.js'
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
    if (warping) return { success: false, reason: 'busy' }

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

        const rwdzBig = typeof rwdzRaw === 'bigint' ? rwdzRaw : BigInt(String(rwdzRaw).trim())
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

export function clearWarpAddr() { warpCsdz = null }

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
// ============================================================
const AD_STR_OFFSET = 0x2C
const AD_FLAG1_OFFSET = 18420
const AD_FLAG2_OFFSET = 0x60
const AD_FLAG1_VALUE = 80
const AD_FLAG2_VALUE = -1
const AD_STR_CLEAR_LEN = 24
const AD_STR_MAX_LEN = 31
const AD_RWDZ_MAPID_OFFSET = 24812n

const AD_MAP_SIGNATURES = {
    '-768833570': '1141201306',   // 遇境
    '1509719447': '-1040239821',  // 云巢
    '-389882442': '1137190502',   // 云巢小屋
    '1936276829': '1089213403',  // 故事空间
}

const AD_MAP_NAMES = {
    '-768833570': '遇境',
    '-1040239821': '云巢',
    '1137190502': '云巢小屋',
    '1089213403': '故事空间'
}

let adRymAddr = null
let adRym = null
let adStrAddr = null
let adFlag1Addr = null
let adFlag2Addr = null
let adInited = false
let adCurrentMapId = null

/**
 * 获取当前地图信息的异步函数
 * 该函数会尝试获取当前地图的ID、名称和签名，并进行错误处理
 * @returns {Object} 返回包含地图信息的对象，包含id、name、sig和addr属性
 */
async function adGetCurrentMap() {
    try {
        // 等待偏移量准备就绪
        await waitForOffsetsReady()

        let rwdzRaw = null  // 存储原始人物地址的变量
        let retries = 0    // 重试次数计数器
        // 当没有获取到有效地址且重试次数小于5时，继续尝试获取
        while (!rwdzRaw && retries < 5) {
            // 获取人物地址
            rwdzRaw = await getPtr('rwdz')
            // 如果获取失败，等待50毫秒后重试
            if (!rwdzRaw) {
                await new Promise(r => setTimeout(r, 50))
                retries++  // 增加重试次数
            }
        }

        // 如果多次尝试后仍未获取到有效地址，返回未知地图信息
        if (!rwdzRaw) {
            return { id: null, name: '未知（人物地址无效）', sig: null }
        }

        // 将地址转换为BigInt类型
        const rwdzBig = typeof rwdzRaw === 'bigint' ? rwdzRaw : BigInt(String(rwdzRaw).trim())
        // 计算地图ID的内存地址
        const mapIdBig = rwdzBig + AD_RWDZ_MAPID_OFFSET
        // 将地址转换为十六进制字符串格式
        const mapIdAddrHex = '0x' + mapIdBig.toString(16)
        // 从内存中读取地图ID值
        const curMapId = Number(h5gg.getValue(mapIdAddrHex, 'I32'))

        // 如果地图ID无效或为0，返回读取中的状态
        if (!curMapId || curMapId === 0) {
            return { id: null, name: '读取中（地图ID为0）', sig: null }
        }

        // 设置地图ID的内存地址引用
        setAddr('mapId', mapIdAddrHex, { type: 'I32' })
        // 获取当前地图名称，如果没有则使用"未知(地图ID)"格式
        const curMapName = mapIdToName[String(curMapId)] || ('未知(' + curMapId + ')')
        // 设置地图名称的内存地址引用，并设置派生函数用于动态获取
        setAddr('mapName', mapIdAddrHex, {
            type: 'STRING',
            derive: (getValueFn) => {
                const id = Number(getValueFn(mapIdAddrHex, 'I32'))
                return mapIdToName[String(id)] || ('未知(' + id + ')')
            }
        })

        // 获取当前地图的签名，如果没有则为null
        const sig = AD_MAP_SIGNATURES[String(curMapId)] || null
        // 返回完整的地图信息
        return { id: curMapId, name: curMapName, sig, addr: mapIdAddrHex }
    } catch (e) {
        // 捕获并打印异常信息
        console.error('[任意门] 读当前地图异常:', e)
        // 返回异常状态
        return { id: null, name: '读取异常', sig: null, addr: null }
    }
}

/**
 * 向指定内存地址写入字符串
 * @function adWriteString
 * @param {number} addr - 目标内存地址，必须为正数
 * @param {*} str - 要写入的字符串，会被转换为字符串类型
 * @returns {boolean} 写入成功返回true，失败返回false
 * 
 * @description
 * 该函数用于向指定内存地址写入字符串，具体功能如下：
 * 1. 检查地址有效性（必须为正数）
 * 2. 将输入转换为字符串类型
 * 3. 清除目标地址原有内容（使用AD_STR_CLEAR_LEN长度）
 * 4. 写入新字符串内容（最大长度为AD_STR_MAX_LEN）
 * 5. 确保字符串以null结尾
 * 
 * @throws {Error} 当内存操作失败时会在控制台输出错误信息
 * 
 * @example
 * const success = adWriteString(0x123456, "Hello World");
 * if (!success) {
 *     console.log("写入失败");
 * }
 */
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
 * 从指定内存地址读取字符串
 * @param {number} addr - 内存地址
 * @returns {string} 读取到的字符串，如果读取失败则返回空字符串
 */
function adReadString(addr) {
    // 检查地址是否有效
    if (!addr || addr <= 0) return ''
    try {
        // 初始化存储原始数据的数组
        const raw = []
        // 循环读取指定长度的内存数据
        for (let i = 0; i < AD_STR_CLEAR_LEN; i++) {
            // 将地址转换为十六进制，并读取该地址处的U8类型值
            raw.push(Number(h5gg.getValue('0x' + (addr + i).toString(16), 'U8')))
        }
        // 查找有效字符的起始位置
        let start = -1
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

/**
 * 通过特征码定位游戏内存地址
 * @param {number} searchValue - 要搜索的特征码值
 * @returns {boolean} - 是否成功定位到有效地址
 */
function adLocateBySignature(searchValue) {
    try {
        // 清除之前的搜索结果
        h5gg.clearResults()
        // 在指定内存范围内搜索特征码
        h5gg.searchNumber(searchValue, 'I32', '0x130000000', '0x200000000')
        // 获取搜索结果的数量
        const count = h5gg.getResultsCount()
        console.log('[任意门] 特征码 ' + searchValue + ' 搜索结果数:', count)
        // 如果没有搜索结果，清除结果并返回false
        if (!count) {
            h5gg.clearResults()
            return false
        }
        // 获取所有搜索结果
        const results = h5gg.getResults(count) || []
        // 清除搜索结果
        h5gg.clearResults()
        // 如果结果为空，返回false
        if (!results.length) return false

        let chosen = null
        // 遍历所有搜索结果
        for (let i = 0; i < results.length; i++) {
            // 获取基础地址
            const baseAddr = Number(results[i].address)
            // 如果地址无效，跳过当前循环
            if (!baseAddr || baseAddr <= 0) continue

            // 计算测试地址和字符串地址
            const testRym = baseAddr + 4
            const testStr = testRym + AD_STR_OFFSET

            let sample = ''
            try {
                // 收取原始字节
                const raw = []
                // 读取指定长度的字节
                for (let j = 0; j < AD_STR_CLEAR_LEN; j++) {
                    raw.push(Number(h5gg.getValue('0x' + (testStr + j).toString(16), 'U8')))
                }
                // 查找可打印字符的起始位置
                let start = -1
                for (let j = 0; j < raw.length; j++) {
                    if (raw[j] >= 0x20 && raw[j] <= 0x7E) { start = j; break }
                }
                // 如果找到有效起始位置，构建字符串样本
                if (start >= 0) {
                    for (let j = start; j < raw.length; j++) {
                        const b = raw[j]
                        // 遇到非可打印字符时停止
                        if (b === 0 || b < 0x20 || b > 0x7E) break
                        sample += String.fromCharCode(b)
                    }
                }
            } catch (e) { continue } // 如果读取失败，跳过当前循环

            // 检查字符串是否符合关卡名格式
            const isMapName = /^[A-Za-z0-9_]{2,31}$/.test(sample)
            console.log(`[任意门] 候选 ${i + 1}/${results.length}: baseAddr=0x${baseAddr.toString(16)}, 字符串="${sample}", 像关卡名=${isMapName}`)

            // 如果符合关卡名格式，选择这个地址
            if (isMapName) {
                chosen = { baseAddr, sample }
                break
            }
        }

        // 如果没有找到合适的候选地址
        if (!chosen) {
            console.warn('[任意门] 特征码 ' + searchValue + ' 的所有候选都不像关卡名')
            return false
        }
        // 设置各种地址变量
        adRymAddr = chosen.baseAddr
        adRym = chosen.baseAddr + 4
        adStrAddr = adRym + AD_STR_OFFSET
        adFlag1Addr = adRym + AD_FLAG1_OFFSET
        adFlag2Addr = adRym + AD_FLAG2_OFFSET

        // 输出选定的地址信息
        console.log('[任意门] 选定 baseAddr=0x' + chosen.baseAddr.toString(16) +
            ', rym=0x' + adRym.toString(16) +
            ', str=0x' + adStrAddr.toString(16) +
            ', flag1=0x' + adFlag1Addr.toString(16) +
            ', flag2=0x' + adFlag2Addr.toString(16) +
            ', 当前字符串="' + chosen.sample + '"')
        return true
    } catch (e) {
        // 捕获并处理异常
        console.error('[任意门] 特征码定位异常:', e)
        try { h5gg.clearResults() } catch (_) { } // 确保清除搜索结果
        return false
    }
}

/**
 * 初始化任意门功能
 * 该函数用于初始化任意门功能，包括检查缓存、获取当前地图信息、定位特征码等操作
 * @returns {Promise<boolean>} 返回一个Promise，解析为初始化是否成功
 */
export async function initAnyDoor() {
    // 检查是否已经初始化且相关地址有效
    if (adInited && adRym && adStrAddr) {
        try {
            // 尝试读取缓存地址的值，如果成功则返回true
            Number(h5gg.getValue('0x' + adFlag1Addr.toString(16), 'I32'))
            return true
        } catch (e) {
            // 如果读取失败，输出警告信息并重置初始化状态
            console.warn('[任意门] 缓存地址失效，需要重新搜索')
            adInited = false
        }
    }

    // 获取当前地图信息
    const cur = await adGetCurrentMap()
    // 检查是否成功获取地图ID
    if (!cur.id) {
        console.warn('[任意门] 无法读取当前地图，初始化失败')
        return false
    }
    // 输出当前地图信息
    console.log('[任意门] 当前地图: ' + cur.name + ' (I32=' + cur.id + ')' + ', 地址= ' + (cur.addr || '未知'))

    // 检查当前地图是否有特征码配置
    if (cur.sig === null) {
        console.warn('[任意门] 当前地图「' + cur.name + '」暂未配置特征码，无法初始化')
        return false
    }

    // 根据特征码进行定位
    const ok = adLocateBySignature(cur.sig)
    // 更新初始化状态
    adInited = ok
    if (ok) {
        // 保存当前地图ID
        adCurrentMapId = cur.id
        // 设置特征码和字符串的地址
        setAddr('任意门特征码', adRymAddr, { type: 'I32' })
        setAddr('任意门字符串', adStrAddr, { type: 'STR' })
        // 输出缓存成功信息
        console.log('[任意门] 缓存成功，来源地图: ' + cur.name)
    }
    return ok
}

/**
 * 任意门功能实现函数，用于写入特定代码并设置标志位
 * @param {string} code - 要写入的代码字符串
 * @returns {Object} 包含操作结果的对象
 */
export async function goMapAnyDoor(code) {
    // 检查输入参数是否有效
    if (!code || typeof code !== 'string') {
        return { success: false, reason: 'bad-arg' }
    }
    // 检查代码格式是否合法（只允许字母、数字和下划线）
    if (!/^[A-Za-z0-9_]+$/.test(code)) {
        return { success: false, reason: 'bad-code' }
    }
    // 检查代码长度是否超过最大限制
    if (code.length > AD_STR_MAX_LEN) {
        return { success: false, reason: 'code-too-long', maxLen: AD_STR_MAX_LEN, input: code.length }
    }

    // 初始化任意门功能，如果失败则返回错误
    if (!await initAnyDoor()) {
        return { success: false, reason: 'init-failed' }
    }

    try {
        // 读取并显示写入前的字符串内容
        const before = adReadString(adStrAddr)
        console.log('[任意门] 写前字符串="' + before + '"')

        // 尝试写入新代码
        if (!adWriteString(adStrAddr, code)) {
            return { success: false, reason: 'write-string-failed' }
        }
        // 写入后立即读取并验证
        const afterWrite = adReadString(adStrAddr)
        console.log('[任意门] 写后立即读="' + afterWrite + '" (期望="' + code + '")')


        // 如果写入后读取的内容不匹配，发出警告
        if (afterWrite !== code) {
            console.warn('[任意门] ⚠️ 写后读回不匹配，继续写标志...')
            uni.showToast({ icon: 'none', title: '⚠️ 写后读回不匹配，继续写标志... ' })
        }

        // 设置标志位1和2的十六进制地址
        const addr1Hex = '0x' + adFlag1Addr.toString(16)
        const addr2Hex = '0x' + adFlag2Addr.toString(16)
        // 写入标志值
        h5gg.setValue(addr2Hex, AD_FLAG2_VALUE, 'I32')
        h5gg.setValue(addr1Hex, AD_FLAG1_VALUE, 'I32')

        // 读取并显示标志值
        const f1 = Number(h5gg.getValue(addr1Hex, 'I32'))
        const f2 = Number(h5gg.getValue(addr2Hex, 'I32'))
        console.log('[任意门] 标志回读: flag1=' + f1 + ', flag2=' + f2)

        // 返回操作成功的结果
        return {
            success: true,
            writtenCode: afterWrite,
            flag1: f1,
            flag2: f2
        }
    } catch (e) {
        // 捕获并处理异常
        console.error('[任意门] goMapAnyDoor 异常:', e)
        return { success: false, reason: 'exception', message: e.message }
    }
}

/**
 * 写入任意门代码的函数
 * @param {string} code - 要写入的任意门代码
 * @returns {boolean} - 写入操作是否成功
 */
export function writeAnyDoorCode(code) {
    // 检查广告模块是否初始化且地址是否有效
    if (!adInited || !adStrAddr) return false
    // 调用写入字符串函数将代码写入指定地址
    return adWriteString(adStrAddr, code)
}

/**
 * 触发任意门广告功能函数
 * 该函数用于设置特定的内存地址值，以触发游戏中的任意门广告功能
 * @returns {boolean} 返回操作是否成功，成功返回true，失败返回false
 */
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

export function clearWarpCaches() {
    warpCsdz = null
    mapCoreAddr = null
    currentMapIdAddr = null
    clearAnyDoorCache()
}