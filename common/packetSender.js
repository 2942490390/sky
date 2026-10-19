// common/packetSender.js
// 神龛 / 全动作发包（Submit 结构体）
// 防崩设计：递归 setTimeout + 空闲检测 + 重解析 + 停止时只置标志不抢写

// import { getPtr, addrjump, getModuleAddr } from './h5gg.js'
import { showToast } from '../utils/toast.js'



// ============================================================
// 数据表（从 demo10 复制）
// ============================================================
export const ARR_SHRINE = [
    "CandleSpace", "StormLight", "Dawn_Start", "Dawn", "Dawn_Shrine", "Dawn_Plateau",
    "DawnCave", "Dawn_TrialsAir", "Dawn_TrialsEarth", "Dawn_TrialsFire", "Dawn_TrialsWater",
    "Prairie_ButterflyFields_Town", "Prairie_ButterflyFields", "Prairie_Cave", "Prairie_Village",
    "DayHubCave", "Prairie_NestAndKeeper", "Prairie_Island", "Prairie_Village_Shrine",
    "Rain_Town", "Rain", "Skyway", "Rain_BaseCamp", "RainForest", "RainShelter",
    "Rain_Cave", "RainMid", "RainEnd", "RainEnd_Pond", "Sunset_Town", "Sunset",
    "Sunset_Citadel", "Sunset_FlyRace", "SunsetRace", "SunsetColosseum", "SunsetVillage",
    "SunsetVillage_MusicShop", "Sunset_Theater", "Sunset_YetiPark", "DuskStart", "Dusk",
    "DuskGraveyard", "Dusk_CrabField", "DuskMid", "DuskEnd", "DuskOasis", "Dusk_Triangle",
    "Night", "NightArchive", "Night_ThirdFloor", "Night2", "Night2_SecondFloor",
    "NightDesert", "TGCOffice", "StormStart", "Storm", "StormEnd", "CandleSpaceEnd"
]

export const ARR_ALL_ACTIONS = [
    "frustration", "slowwalk", "bask", "draw", "balltrick", "breakdance", "approve",
    "write", "come", "nothanks", "point", "yawn", "wave", "butterfly", "laugh", "bird",
    "thumbsup", "wipe", "beacon", "ohno", "cry", "shy", "seek", "cold", "sorry", "pout",
    "whale", "strong", "bow", "backflip", "proud", "cheer", "handstand", "manta",
    "lookaround", "salute", "scared", "brave", "die", "sneaky", "force", "float", "ghost",
    "love", "pray", "sass", "salutation", "sarcastic", "joy", "acknowledge", "kungfu",
    "doublefive", "lazycool", "tripleaxel", "crabvoice", "shh", "carry", "celebrate",
    "loopdance", "sparkler", "wise", "dontgo", "hairtousle", "dance", "juggle", "kiss",
    "welcome", "respect", "think", "nod", "scare", "playfight", "shrug", "crabwalk",
    "doze", "jelly", "timid", "rally", "grumpy", "gratitude", "bellyscratch", "deepbreath",
    "dustoff", "balance", "chestpound", "peek", "spintrick", "bearhug", "showdance", "eww",
    "chuckle", "marching", "tsktsk", "bubbles", "facepalm", "beckon", "gloat", "stretch",
    "slouch", "sneeze", "scheme", "voila", "pointup", "babymanta", "nerdy", "anxious",
    "wait", "ouch", "evillaugh", "headbob", "duetdance", "handshake", "awww",
    "darkvoidspace02", "darkvoidspace01", "lightvoidspace01", "lightvoidspace02",
    "armwave", "raisetheroof", "twirl", "rhythmicclap", "conduct", "silentclap", "skip",
    "plead", "tiptoe", "grief", "injured", "hackysack", "roll", "mope", "pullup",
    "sidehug", "jollydance", "windpose", "nightbird",
    "ap20_haberdasher", "ap20_cobbler", "ap20_modiste", "ap20_lapidary",
    "whistle", "muscle", "princesscarry", "floatdance",
    "ap22_carpenter", "ap22_upholsterer", "ap22_weaver", "ap22_mason",
    "ap23_pianist_stage01", "ap23_cello_stage01", "ap23_pianist_stage02", "ap23_cello_stage02",
    "ap23_instrument_shop", "ap24_home", "ap24_friend", "ap24_wanderer", "ap24_family",
    "hearthands", "cartwheel", "hypedance",
    "ap26_cousin", "ap26_mourner", "ap26_lumberjack", "ap26_future",
    "amazed", "cough", "manatee", "guard",
    "ap27_caretaker", "ap27_oldman", "ap27_memory1", "ap27_memory2",
    "ap27_memory3", "ap27_memory4",
    "flag", "airplanearms", "jellydance", "dizzy", "lighthorn",
    "revolvingdance", "cuteclap", "secrethandshake", "whisper", "duetbownfc"
]

// ============================================================
// 内部工具
// ============================================================
function toAddrNum(v) {
    if (v === null || v === undefined) return 0
    if (typeof v === 'bigint') return Number(v)
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
}

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
    try { showToast(String(msg), 2000) } catch (e) { }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/** 地址是否可读（读一次 I32 不抛异常即视为可读） */
function isReadable(addr) {
    const a = toAddrNum(addr)
    if (!a || a < 0x100000000) return false
    try {
        h5gg.getValue('0x' + a.toString(16), 'I32')
        return true
    } catch (e) {
        return false
    }
}

/** 把字符串按 ASCII 写入 addr（最多 27 字节，末尾补 0） */
function writeStringBytes(addr, str) {
    const a = toAddrNum(addr)
    if (!a) return false
    try {
        const bytes = new Array(28).fill(0)
        for (let i = 0; i < str.length && i < 27; i++) bytes[i] = str.charCodeAt(i) & 0xFF
        for (let j = 0; j < 28; j += 4) {
            const w = (bytes[j] | (bytes[j + 1] << 8) | (bytes[j + 2] << 16) | (bytes[j + 3] << 24)) >>> 0
            h5gg.setValue('0x' + (a + j).toString(16), w, 'U32')
        }
        return true
    } catch (e) {
        return false
    }
}

// ============================================================
// Submit 地址解析
// ============================================================
let _submitCache = 0

async function resolveSubmitAddr() {
    try {
        const mainBase = Number(h5gg.getRangesList(0)[0].start)
        if (!mainBase) return 0
        const L0 = Number(h5gg.getValue(mainBase + 0x48E06D0, 'I64'))
        if (!L0) return 0
        const P1 = Number(h5gg.getValue(L0 + 0x7ED0, 'I64'))
        if (!P1) return 0
        const _a = Number(h5gg.getValue(P1 + 0xB8, 'I64'))
        if (!_a) return 0
        const _b = Number(h5gg.getValue(_a + 0x60, 'I64'))
        if (!_b) return 0
        _submitCache = _b + 0x2005E8
        return _submitCache
    } catch (e) {
        return 0
    }
}

// ============================================================
// 发包核心
// ============================================================

/**
 * 提交一个包
 * 顺序：先写指针 → 写包类型 → 清结果 → 最后置标志
 * 停止标志 _batchStop 为 true 时立即返回，不写 Submit
 */
async function submitPacket(addr, timeoutMs) {
    // ★ 已请求停止 → 不提交
    if (_batchStop) return false

    const submit = await resolveSubmitAddr()
    if (!submit) return false
    if (!addr || addr <= 0) return false

    // 空闲检测：+0 必须为 0（游戏没在提交）
    try {
        const busy = Number(h5gg.getValue('0x' + submit.toString(16), 'I32'))
        if (busy !== 0) return false
    } catch (e) {
        return false
    }

    try {
        // ① 写指针
        const lo = ((addr % 4294967296) + 4294967296) % 4294967296
        const hi = Math.floor(addr / 4294967296)
        h5gg.setValue('0x' + (submit + 8).toString(16), lo, 'U32')
        h5gg.setValue('0x' + (submit + 12).toString(16), hi, 'U32')
        // ② 写包类型
        h5gg.setValue('0x' + (addr + 12).toString(16), 2, 'I32')
        // ③ 先清结果，最后置标志
        h5gg.setValue('0x' + (submit + 4).toString(16), 0, 'I32')
        h5gg.setValue('0x' + submit.toString(16), 1, 'I32')
    } catch (e) {
        return false
    }

    // 轮询等待完成（await 让出，不阻塞 UI）
    const t0 = Date.now()
    const TO = timeoutMs || 800
    while (true) {
        // ★ 停止请求 → 立即退出，不写 Submit
        if (_batchStop) return false

        if ((Date.now() - t0) > TO) {
            try {
                h5gg.setValue('0x' + submit.toString(16), 2, 'I32')
                h5gg.setValue('0x' + (submit + 4).toString(16), 31, 'I32')
            } catch (e) { }
            return false
        }

        try {
            const r = Number(h5gg.getValue('0x' + (submit + 4).toString(16), 'I32'))
            if (r === 1) return true
        } catch (e) {
            return false
        }

        // ★ 让出 JS 线程，UI 可响应停止按钮
        await sleep(5)
    }
}

// ============================================================
// 批量发包状态
// ============================================================

let _batchTimer = null
let _batchRunning = false
let _batchStop = false
let _batchFinished = false    // ★ 防重入
let _batchName = ''
let _batchItems = []
let _batchIndex = 0
let _batchOk = 0
let _batchFail = 0
let _batchInterval = 150
let _batchOnDone = null
let _batchPhase = 'send'
let _batchCooldown = 0
let _batchSinceRefresh = 0

export function isBatchRunning() { return _batchRunning }

// ============================================================
// 批量发包控制
// ============================================================

export function startPacketBatch(name, items, onDone, interval) {
    console.log('[batch] start:', name, 'items:', items.length, 'interval:', interval)
    if (_batchRunning) {
        toast('已有任务进行中: ' + _batchName)
        return false
    }
    _batchRunning = true
    _batchStop = false
    _batchFinished = false
    _batchName = name
    _batchItems = items
    _batchIndex = 0
    _batchOk = 0
    _batchFail = 0
    _batchInterval = interval || 1000
    _batchOnDone = onDone
    _batchPhase = 'send'
    _batchCooldown = 0
    _batchSinceRefresh = 0
    schedule()

    console.log('[batch] 已启动:', name)
    return true
}

function schedule() {
    if (!_batchRunning || _batchStop) {
        doFinish()
        return
    }
    console.log('_batchInterval', _batchInterval)
    _batchTimer = setTimeout(tick, _batchInterval)
}

async function tick() {
    if (!_batchRunning || _batchStop) { doFinish(); return }

    try {
        // 冷却阶段
        if (_batchPhase === 'cooldown') {
            _batchCooldown--
            if (_batchCooldown > 0) { schedule(); return }
            _batchPhase = 'send'
        }

        // 每 10 个包重解析一次 Submit
        if (_batchSinceRefresh >= 10) {
            _batchSinceRefresh = 0
            await resolveSubmitAddr()
            if (_batchStop) { doFinish(); return }
        }

        // 全部完成
        if (_batchIndex >= _batchItems.length) { doFinish(); return }

        const item = _batchItems[_batchIndex]
        // 写包数据
        if (item.writeFn) {
            const w = item.writeFn()
            if (w === false) {
                _batchFail++
                _batchIndex++
                schedule()
                return
            }
        }

        // 提交（submitPacket 内部会检测 _batchStop）
        const ok = await submitPacket(item.addr, 800)

        // ★ 提交返回后再次检查停止
        if (_batchStop) { doFinish(); return }

        if (ok) _batchOk++
        else _batchFail++
        _batchIndex++
        _batchSinceRefresh++

        // 冷却 2 tick
        _batchPhase = 'cooldown'
        _batchCooldown = 2
        schedule()
    } catch (e) {
        if (_batchStop) { doFinish(); return }
        _batchFail++
        _batchIndex++
        schedule()
    }
}

/**
 * 真正的结束逻辑，只由 tick / schedule 调用
 * 用 _batchFinished 防重入
 */
function doFinish() {
    console.log('[batch] doFinish: running=', _batchRunning, 'stop=', _batchStop, 'finished=', _batchFinished, 'name=', _batchName, 'index=', _batchIndex, 'ok=', _batchOk, 'fail=', _batchFail)
    if (_batchFinished) return
    _batchFinished = true

    if (_batchTimer) { clearTimeout(_batchTimer); _batchTimer = null }

    const wasStop = _batchStop
    const ok = _batchOk
    const fail = _batchFail
    const total = _batchItems.length
    const onDone = _batchOnDone
    const name = _batchName

    _batchRunning = false
    _batchStop = false
    _batchItems = []
    _batchOnDone = null

    // ★ 清理 Submit 残状态：先验证地址有效，且写之前不抛
    // 避免 _submitCache 野指针导致 native 崩溃
    try {
        if (isReadable(_submitCache)) {
            h5gg.setValue('0x' + _submitCache.toString(16), 2, 'I32')
            h5gg.setValue('0x' + (_submitCache + 4).toString(16), 31, 'I32')
        }
    } catch (e) { }

    if (wasStop) {
        toast('已停止: ' + name)
    } else if (typeof onDone === 'function') {
        try { onDone(ok, fail, total) } catch (e) { }
    }
}

/**
 * 停止：只置标志 + 清定时器，不调 doFinish
 * 清理交给 tick/schedule 内 doFinish
 * 若当前没有 tick 在跑（在 cooldown 等待中），用 setTimeout 兜底触发
 */
export function stopPacketBatch() {
    if (!_batchRunning) return
    _batchStop = true
    if (_batchTimer) { clearTimeout(_batchTimer); _batchTimer = null }

    // 兜底：50ms 后如果还没 finish（说明 tick 不在跑，submitPacket 也没在跑），主动 finish
    setTimeout(() => {
        if (_batchRunning && _batchStop) {
            doFinish()
        }
    }, 80)
}

// ============================================================
// 业务封装
// ============================================================

export function startShrineUnlock() {
    const shrineAddr = getShrineAddr()
    console.log('shrineAddr', shrineAddr ? '0x' + shrineAddr.toString(16) : '0')
    if (!shrineAddr) {
        toast('神龛：地址未找到（请先确保游戏已加载）')
        return false
    }
    const names = ARR_SHRINE.filter(n => n.length <= 27)
    const items = names.map(nm => ({
        addr: shrineAddr,
        writeFn: () => writeStringBytes(shrineAddr + 0x68, nm)
    }))
    return startPacketBatch('神龛', items, (ok, fail, total) => {
        toast('神龛完成: 成功' + ok + ' 失败' + fail + ' / 共' + total)
    }, 2000)
}

export function startAllActions() {
    const xzdzAddr = getXZDZAddr()
    console.log('xzdzAddr', xzdzAddr ? '0x' + xzdzAddr.toString(16) : '0')
    toast((xzdzAddr ? '0x' + xzdzAddr.toString(16) : '0'))
    if (!xzdzAddr) {
        toast('全动作：地址未找到（请先确保游戏已加载）')
        return false
    }
    const names = ARR_ALL_ACTIONS
        .filter(n => n.length <= 27)
        .filter(n => !/^ap\d+_/.test(n))
    const items = names.map(nm => ({
        addr: xzdzAddr,
        writeFn: () => writeStringBytes(xzdzAddr + 0x68, nm)
    }))
    return startPacketBatch('全动作', items, (ok, fail, total) => {
        toast('全动作完成: 成功' + ok + ' 失败' + fail + ' / 共' + total)
    }, 2000)
}

function getShrineAddr() {
    try {
        const mainBase = Number(h5gg.getRangesList(0)[0].start)
        const L0 = Number(h5gg.getValue(mainBase + 0x48E06D0, 'I64'))
        if (!L0) return 0
        const P1 = Number(h5gg.getValue(L0 + 0x7ED0, 'I64'))
        if (!P1) return 0
        const v = Number(h5gg.getValue(P1 + 0x10, 'I64'))
        if (!v) return 0
        return v + 0xD0
    } catch (e) { return 0 }
}

function getXZDZAddr() {
    try {
        const mainBase = Number(h5gg.getRangesList(0)[0].start)
        const L0 = Number(h5gg.getValue(mainBase + 0x48E06D0, 'I64'))
        if (!L0) return 0
        const P1 = Number(h5gg.getValue(L0 + 0x7ED0, 'I64'))
        if (!P1) return 0
        const v = Number(h5gg.getValue(P1 + 0x80, 'I64'))
        if (!v) return 0
        return v
    } catch (e) { return 0 }
}