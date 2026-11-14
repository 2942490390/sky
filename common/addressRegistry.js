// common/addressRegistry.js
// 全局地址注册表：所有模块拿到地址后注册到这里，DevMonitor 页面实时读取
import { reactive, computed } from 'vue'

// ============ 分组定义 ============
export const GROUPS = {
    coordinate: { name: '人物/坐标', icon: 'fa-solid fa-ruler' },
    movement: { name: '运动/传送', icon: 'fa-solid fa-route' },
    energy: { name: '能量/魔法', icon: 'fa-solid fa-bolt' },
    combat: { name: '战斗/防御', icon: 'fa-solid fa-shield' },
    entertainment: { name: '娱乐功能', icon: 'fa-solid fa-wand-magic-sparkles' },
    scene: { name: '场景/引擎', icon: 'fa-solid fa-gear' },
    packet: { name: '发包/地图', icon: 'fa-solid fa-envelope' },
    shield: { name: '能量盾', icon: 'fa-solid fa-shield-halved' },
    other: { name: '其他', icon: 'fa-solid fa-ellipsis' },
}

// ============ 地址元信息 ============
// key -> { label, group, type, desc }
// type 说明：
//   BASE = 地址本身（用 U64 读出它指向的指针值）
//   HEX  = U32 读，格式化为 0x 字符串
//   F32/I32/I64/U64... = 直接按该类型读
export const ADDR_META = {
    // --- 坐标 ---
    rwdz: { label: '人物坐标', group: 'coordinate', type: 'BASE', desc: 'rwdz 指针基址，X/Y/Z 起点' },
    coordX: { label: '坐标 X', group: 'coordinate', type: 'F32', desc: 'rwdz + 0' },
    coordZ: { label: '坐标 Z', group: 'coordinate', type: 'F32', desc: 'rwdz + 4' },
    coordY: { label: '坐标 Y', group: 'coordinate', type: 'F32', desc: 'rwdz + 8' },
    flagAddr: { label: '坐标特征值', group: 'coordinate', type: 'HEX', desc: '缓存校验用' },

    // --- 运动 ---
    goldF32: { label: '设置高度', group: 'movement', type: 'F32', desc: '指针链 goldF32' },
    bigjump: { label: '大跳', group: 'movement', type: 'F32', desc: '指针链 bigjump' },
    gysl: { label: '光翼数量', group: 'movement', type: 'I32', desc: '指针链 gysl' },
    zy: { label: '炸翼', group: 'movement', type: 'I32', desc: '指针链 zy' },
    lockHeight: { label: '锁定高度', group: 'movement', type: 'F32', desc: 'rwdz + 8' },

    // --- 能量/魔法 ---
    energy: { label: '无限能量', group: 'energy', type: 'F32', desc: '指针链 energy' },
    ysaring: { label: '隐身', group: 'energy', type: 'F32', desc: '指针链 ysaring' },
    wxmf: { label: '无限魔法', group: 'energy', type: 'I32', desc: '指针链 wxmf' },
    wingCount: { label: '光翼写入', group: 'energy', type: 'I32', desc: '同 gysl' },
    wingBurst: { label: '炸翼写入', group: 'energy', type: 'I32', desc: '同 zy' },
    wyAddr: { label: '无翼', group: 'energy', type: 'F32', desc: 'energy + 0x98' },
    glowAddr: { label: '人物发光', group: 'energy', type: 'F32', desc: 'energy + 0x19AC' },
    magicCount: { label: '魔法卡槽数', group: 'energy', type: 'I32', desc: 'magic.js' },

    // --- 战斗 ---
    noWingGuard: { label: '守护无翼', group: 'combat', type: 'I32', desc: '指针链 noWingGuard' },
    krill: { label: '无视冥龙', group: 'combat', type: 'I32', desc: 'getModuleAddr 0x54BB8F8' },
    antiReport: { label: '防举报', group: 'combat', type: 'I32', desc: 'getModuleAddr 0x50453DC' },
    friendTree: { label: '解锁好友树', group: 'combat', type: 'I32', desc: 'getModuleAddr 0x532F3D0' },

    // --- 娱乐 ---
    wxyh: { label: '无限烟花', group: 'entertainment', type: 'I32', desc: '指针链 wxyh' },
    outfit: { label: '烟花槽位', group: 'entertainment', type: 'I32', desc: '指针链 outfit' },
    wxyha: { label: '烟花数量', group: 'entertainment', type: 'I32', desc: '指针链 wxyha' },
    autoIgnite: { label: '燃烧弹', group: 'entertainment', type: 'F32', desc: '指针链 autoIgnite' },
    fq: { label: '去风墙', group: 'entertainment', type: 'F32', desc: '指针链 fq' },
    offline: { label: '全局离线', group: 'entertainment', type: 'F32', desc: '指针链 offline' },
    skipAnim: { label: '跳过动画', group: 'entertainment', type: 'I32', desc: 'getModuleAddr 0x579CB00' },

    // --- 场景 ---
    sceneBright: { label: '场景亮度', group: 'scene', type: 'F32', desc: 'scene.js 搜索' },
    speedAddr: { label: '全局加速', group: 'scene', type: 'F32', desc: '搜索 A+24' },
    burnAddr: { label: '自燃地址', group: 'scene', type: 'BASE', desc: 'h5gg.js 搜索' },
    bloomAddr: { label: '炸花地址', group: 'scene', type: 'BASE', desc: 'h5gg.js 搜索' },
    candleAddr: { label: '蜡烛地址', group: 'scene', type: 'BASE', desc: '隐藏蜡烛' },

    // --- 发包/地图 ---
    warpCsdz: { label: '遇境路牌', group: 'packet', type: 'HEX', desc: '传送路牌地址' },
    mapCore: { label: '地图核心', group: 'packet', type: 'BASE', desc: 'initMapCore' },
    submitAddr: { label: 'Submit 结构', group: 'packet', type: 'BASE', desc: 'packetSender' },
    shrineAddr: { label: '神龛地址', group: 'packet', type: 'BASE', desc: 'packetSender' },
    xzdzAddr: { label: '全动作地址', group: 'packet', type: 'BASE', desc: 'packetSender' },

    // --- 能量盾 ---
    nldBase: { label: '能量盾基址', group: 'shield', type: 'BASE', desc: 'energyShield.js' },
    nldMain0: { label: '自身·能量盾', group: 'shield', type: 'F32', desc: 'player1 +0xE8' },
    nldOther0: { label: '自身·它人炸', group: 'shield', type: 'F32', desc: 'player1 +0x120' },
    nldSelf0: { label: '自身·自身炸', group: 'shield', type: 'F32', desc: 'player1 +0x114' },

    // --- 其他 ---
    mapId: { label: '当前地图ID', group: 'other', type: 'I32', desc: 'rwdz + 24812' },
    mapName: { label: '当前地图名', group: 'other', type: 'STRING', desc: 'rwdz + 24812' },

}

// ============ 动态补充 meta（能量盾 8 人 + 魔法 9 槽）============
// 能量盾：8 人 × 3 类
for (let i = 0; i < 8; i++) {
    const tag = i === 0 ? '自身' : '玩家' + (i + 1)
    ADDR_META['nldMain' + i] = { label: tag + '·能量盾', group: 'shield', type: 'F32', desc: 'player' + (i + 1) + ' - 0xE8' }
    ADDR_META['nldOther' + i] = { label: tag + '·它人炸', group: 'shield', type: 'F32', desc: 'player' + (i + 1) + ' - 0x120' }
    ADDR_META['nldSelf' + i] = { label: tag + '·自身炸', group: 'shield', type: 'F32', desc: 'player' + (i + 1) + ' - 0x114' }
}

// 魔法：9 槽 × 3 类
const __MAGIC_TITLES = ['背饰', '发型', '斗篷', '裤子', '鞋子', '面具', '效果', '拖尾', '传送']
for (let i = 1; i <= 9; i++) {
    const t = __MAGIC_TITLES[i - 1] || ('槽' + i)
    ADDR_META['magicId' + i] = { label: t + '·魔法ID', group: 'energy', type: 'I32', desc: 'sw - 0x28' }
    ADDR_META['magicTime' + i] = { label: t + '·时间', group: 'energy', type: 'I32', desc: 'sw - 0x14' }
    ADDR_META['magicSwitch' + i] = { label: t + '·开关', group: 'energy', type: 'I32', desc: 'sw' }
}

// 补充用户可配置但没登记的指针链 key
ADDR_META.daoju = { label: '无限道具', group: 'other', type: 'I32', desc: '指针链 daoju' }
ADDR_META.lengqu = { label: '冷却时间', group: 'other', type: 'I32', desc: '指针链 lengqu' }
ADDR_META.lzaddr = { label: '蜡烛地址(链)', group: 'other', type: 'BASE', desc: '指针链 lzaddr' }
ADDR_META.zhuahua = { label: '炸花地址(链)', group: 'other', type: 'BASE', desc: '指针链 zhuahua' }

// ============ 响应式地址表 ============
const state = reactive({
    entries: {},
})

// ============ 注册 / 更新 ============
/**
 * 设置或更新内存地址信息
 * @param {string} key - 地址标识符
 * @param {number|string} addr - 内存地址，可以是数字或16进制字符串
 * @param {Object} [opts={}] - 可选配置对象
 * @param {string} [opts.type] - 地址类型
 * @param {*} [opts.value] - 地址值
 * @param {string} [opts.note] - 地址备注
 * @param {boolean} [opts.ok] - 地址是否有效
 * @param {boolean} [opts.noRefresh] - 是否禁用自动刷新
 */
export function setAddr(key, addr, opts = {}) {
    // 如果 ADDR_META 中没有该 key 的元数据，则创建默认元数据
    if (!ADDR_META[key]) {
        ADDR_META[key] = {
            label: key,
            group: 'other',
            type: opts.type || 'BASE',
            desc: ''
        }
    }

    let num = 0  // 存储数字格式的地址
    let hex = ''  // 存储16进制格式的地址

    // 处理数字类型的地址
    if (typeof addr === 'number' && Number.isFinite(addr) && addr > 0) {
        num = addr
        hex = '0x' + addr.toString(16)
    }
    // 处理16进制字符串类型的地址
    else if (typeof addr === 'string' && /^0x[0-9a-fA-F]+$/.test(addr)) {
        hex = addr.toLowerCase()
        try {
            num = parseInt(addr, 16)
        } catch (e) {
            num = 0
        }
    }

    // 获取之前的地址信息
    const prev = state.entries[key]
    // 检查地址是否与之前相同
    const sameAddr = prev && prev.num === num && num > 0

    // 更新地址信息
    state.entries[key] = {
        key,  // 地址标识符
        hex: hex || '',  // 16进制地址
        num,  // 数字地址
        type: opts.type || (prev && prev.type) || ADDR_META[key].type || 'BASE',  // 地址类型

        // ★ value 字段的特殊处理：
        // 1. 如果 opts 中传入了 value，则使用传入的值
        // 2. 否则保留之前的值，防止 refreshValues 还没运行时被清空
        value: opts.value !== undefined
            ? opts.value
            : (prev ? prev.value : ''),

        // 备注信息，优先使用 opts 中的值，其次使用之前的值
        note: opts.note !== undefined ? opts.note : (prev ? prev.note : ''),

        // 地址是否有效，优先使用 opts 中的值，其次根据地址是否大于0判断
        ok: opts.ok !== undefined ? opts.ok : (num > 0),

        // 是否禁用自动刷新，优先使用 opts 中的值，其次使用之前的值
        noRefresh: opts.noRefresh !== undefined
            ? opts.noRefresh
            : (prev ? prev.noRefresh : false),

        derive: opts.derive !== undefined
            ? opts.derive
            : (prev ? prev.derive : null),

        // 时间戳：如果地址相同则保持原时间戳，否则使用当前时间
        ts: sameAddr ? prev.ts : Date.now(),

        // 历史记录：如果地址相同则保留原历史记录，否则创建新的历史记录
        // 只保留最近4条有效记录（非空且非0地址）
        history: sameAddr
            ? (prev.history || [])
            : (prev ? [...(prev.history || []).slice(-4), { hex: prev.hex, ts: prev.ts }].filter(x => x.hex && x.hex !== '0x0') : []),
    }
}

/** 标记地址失效 */
export function invalidateAddr(key, note = '已失效') {
    const prev = state.entries[key]
    if (!prev) return
    state.entries[key] = { ...prev, ok: false, note, ts: Date.now() }
}

/** 清空所有 */
export function clearAllAddrs() {
    Object.keys(state.entries).forEach(k => delete state.entries[k])
}

// ============ 只读查询 ============
export function getAddr(key) {
    return state.entries[key] || null
}

export function getAllEntries() {
    return state.entries
}

/** 按分组聚合（响应式） */
export const groupedEntries = computed(() => {
    const result = {}
    for (const g in GROUPS) result[g] = []
    for (const key in state.entries) {
        const e = state.entries[key]
        const meta = ADDR_META[key] || { group: 'other' }
        const g = meta.group
        if (!result[g]) result[g] = []
        result[g].push({
            ...e,
            label: meta.label || key,
            metaType: meta.type || 'BASE',
            desc: meta.desc || '',
        })
    }
    for (const g in result) {
        result[g].sort((a, b) => (a.label || '').localeCompare(b.label || ''))
    }
    return result
})

/** 有效地址数量统计 */
export const stats = computed(() => {
    let total = 0, ok = 0
    for (const k in state.entries) {
        total++
        if (state.entries[k].ok) ok++
    }
    return { total, ok, bad: total - ok }
})

// ============ 批量刷新内存值（只给 DevMonitor 用）============
/**
 * 批量读内存值写回 entry.value
 * - BASE 类型用 U64 读出指针值
 * - HEX 类型用 U32 读，格式化为 0x 字符串
 * - 其它类型按自身 type 读
 *
 * @param {(addrHex: string, type: string) => any} getValueFn
 */
export function refreshValues(getValueFn) {
    if (typeof getValueFn !== 'function') return

    for (const key in state.entries) {
        const e = state.entries[key]
        if (!e.hex) continue
        if (e.noRefresh) continue
        // 有 derive 的，走 derive 计算，不读内存
        if (typeof e.derive === 'function') {
            try {
                const v = e.derive(getValueFn)
                const sv = v == null ? '' : String(v)
                if (e.value !== sv) e.value = sv
            } catch (err) { }
            continue
        }

        try {
            let v = null

            // ★ BASE：用 U64 读，返回 0x... 字符串
            if (e.type === 'BASE') {
                const raw = getValueFn(e.hex, 'U64')
                if (raw === null || raw === undefined) continue

                // ★ 兼容 bigint / string / number
                let n
                if (typeof raw === 'bigint') {
                    n = raw
                } else if (typeof raw === 'string') {
                    // 用 BigInt 解析字符串，避免 Number() 精度丢失
                    try {
                        n = BigInt(raw)
                    } catch (e) {
                        n = BigInt(Math.trunc(Number(raw)))
                    }
                } else {
                    n = BigInt(Math.trunc(Number(raw)))
                }

                if (n <= 0n) {
                    if (e.value !== '') e.value = ''
                    continue
                }

                v = '0x' + n.toString(16)
            }
            // ★ HEX：用 U32 读，格式化成 8 位大写 hex
            else if (e.type === 'HEX') {
                const raw = getValueFn(e.hex, 'U32')
                if (raw === null || raw === undefined) continue
                const n = Number(raw)
                if (!Number.isFinite(n)) continue
                v = '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0')
            }
            // ★ F32
            else if (e.type === 'F32') {
                const raw = getValueFn(e.hex, 'F32')
                if (raw === null || raw === undefined) continue
                const n = Number(raw)
                if (!Number.isFinite(n)) continue
                v = parseFloat(n.toFixed(6))
            }
            // ★ I64/U64 保留原样（可能是字符串）
            else if (e.type === 'I64' || e.type === 'U64') {
                const raw = getValueFn(e.hex, e.type)
                if (raw === null || raw === undefined) continue
                v = String(raw)
            }
            else if (e.type === 'STR' || e.type === 'STRING') {
                const raw = getValueFn(e.hex, 'STR')
                if (raw === null || raw === undefined) continue
                v = String(raw)
            }
            // ★ 其它 I8/I16/I32/U8/U16/U32...
            else {
                const raw = getValueFn(e.hex, e.type)
                if (raw === null || raw === undefined) continue
                const n = Number(raw)
                if (!Number.isFinite(n)) continue
                v = n
            }

            // 只在值变化时写回，避免触发无意义重渲染
            if (e.value !== v) e.value = v
        } catch (err) {
            // 读失败不阻塞其它
        }
    }
}