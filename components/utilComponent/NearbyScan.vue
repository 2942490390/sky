<template>
    <view class="near-app">
        <!-- ===== 顶部返回条 ===== -->
        <view class="back-bar">
            <view class="near-btn ghost small" @click="onBack">← 返回</view>
            <text class="back-title">邻近规律扫描器</text>
            <view style="flex:1"></view>
            <text class="back-total" v-if="hitCount > 0">共 {{ hitCount }} 条</text>
        </view>

        <!-- ===== 搜索面板（可折叠） ===== -->
        <view class="near-inputbar">
            <view class="panel-header" @click="inputbarOpen = !inputbarOpen">
                <text class="panel-title">🔍 搜索面板</text>
                <text class="panel-toggle">{{ inputbarOpen ? '▲ 收起' : '▼ 展开' }}</text>
            </view>
            <view class="panel-body" v-show="inputbarOpen">
                <view class="near-row">
                    <text class="near-label">地址</text>
                    <input class="near-input" v-model="inAddr" placeholder="0x102345678" spellcheck="false" />
                </view>
                <view class="near-row">
                    <text class="near-label">数值</text>
                    <input class="near-input" v-model="inValue" placeholder="例如 100 或 3.14 或 50~200"
                        spellcheck="false" />
                </view>
                <view class="near-row">
                    <text class="near-label">指数</text>
                    <input class="near-input" v-model="inShift" placeholder="20（默认2^20，最大2^24）" spellcheck="false" />
                </view>
                <view class="near-row">
                    <text class="near-label">类型</text>
                    <view class="seg">
                        <view v-for="t in ALL_TYPES" :key="t" class="seg-btn" :class="{ on: CUR_TYPE === t }"
                            @click="CUR_TYPE = t">{{ t }}</view>
                    </view>
                    <view class="opt" title="写入验证会真实写入再回滚，对代码页有崩溃风险" @click="inProbe = !inProbe">
                        <view class="mini-chk" :class="{ on: inProbe }"></view>
                        <text>精确权限探测</text>
                    </view>
                    <view class="near-btn" :class="{ disabled: scanning }" @click="onScanSafe"
                        style="margin-left:auto;">
                        {{ scanning ? '扫描中…' : '开始扫描' }}
                    </view>
                </view>
            </view>
        </view>

        <!-- ===== 状态栏 ===== -->
        <view class="status">
            <text>{{ statusText }}</text>
            <text class="toggle-link" @click="inputbarOpen = !inputbarOpen">展开/收起搜索</text>
        </view>

        <!-- ===== 工具栏（可折叠） ===== -->
        <view class="near-toolbar" v-show="toolbarOpen">
            <input class="near-input" v-model="inSetVal" placeholder="赋值数值（对勾选地址生效）" />
            <text class="sel-info">已选 {{ selectedCount }}</text>
            <view class="near-btn ghost" @click="setAllChecks(true)">全选</view>
            <view class="near-btn ghost" @click="toggleAllChecks">反选</view>
            <view class="near-btn danger" @click="applyValues">批量赋值</view>
        </view>

        <!-- ===== 结果头 ===== -->
        <view class="result-head">
            <text>命中：<text class="hit-count">{{ hitCount }}</text></text>
            <view style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                <view class="near-btn ghost small" :class="{ disabled: !LAST_DATA }" @click="refreshSafe">🔄 刷新值</view>
                <text class="toggle-link" @click="toggleMultiType">{{ mtShow ? '▾ 多类型' : '▸ 多类型' }}</text>
                <text class="toggle-link" @click="toolbarOpen = !toolbarOpen">▾ 工具栏</text>
                <view class="near-btn ghost small" @click="onCopyJson">复制JSON</view>
            </view>
        </view>

        <!-- ===== 结果列表：虚拟滚动 ===== -->
        <scroll-view class="near-list" scroll-y :scroll-top="scrollTopPx" @scroll="onScroll">
            <view class="list-spacer" :style="{ height: totalHeightPx + 'px' }">
                <view v-for="item in visibleItems" :key="item._idx" class="item" :class="{ sel: item._checked }"
                    :style="{ top: item._top + 'px' }" :data-idx="item._idx">
                    <view class="chk" :class="{ on: item._checked }" @click.stop="onCheck(item)"></view>
                    <text class="idx">{{ item._idx + 1 }}</text>
                    <text class="addr">{{ item.address }}</text>
                    <text class="val">{{ item.value }}</text>
                    <text class="off">
                        Δ {{ item.offset }} <text style="opacity:.6">({{ item.offsetHex }} · {{ item.offsetSlots
                            }}槽)</text>
                    </text>
                    <text class="perm" :class="item.perm">{{ PERM_TEXT[item.perm] || '未知' }}</text>
                    <text class="cp" @click.stop="copyText(item.address)">复制</text>

                    <!-- 多类型小字 -->
                    <view class="multitype" :class="{ show: mtShow }">
                        <text v-for="t in ALL_TYPES.filter(x => x !== item.type)" :key="t" class="mt-item"
                            :class="{ bad: item.types[t] === null }">
                            <text class="t">{{ t }}</text>
                            <text class="v">{{ formatMt(item.types[t], t) }}</text>
                        </text>
                    </view>
                </view>
            </view>
            <view v-if="LAST_DATA && LAST_DATA.matches.length > MAX_RENDER" class="more-tip">
                仅渲染前 {{ MAX_RENDER }} 条（共 {{ LAST_DATA.matches.length }} 命中），完整数据走「复制JSON」
            </view>
        </scroll-view>

        <!-- ===== toast ===== -->
        <view class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</view>
    </view>
</template>

<script setup>
import { computed, onMounted, ref, shallowRef, triggerRef } from 'vue'

/* ========== 常量 ========== */
const TYPE_SIZE = { I8: 1, I16: 2, I32: 4, I64: 8, F32: 4, F64: 8 }
const ALL_TYPES = ['I8', 'I16', 'I32', 'I64', 'F32', 'F64']
const MAX_SHIFT = 24
const MAX_RENDER = 5000
const PERM_TEXT = { rw: '可读可写', ro: '只读', na: '不可访问' }

/* ========== 虚拟滚动常量 ========== */
const ITEM_BASE_HEIGHT = 30   // 单行基础高度（px）
const ITEM_MT_EXTRA = 18      // 多类型展开时额外高度
const OVERSCAN = 6            // 上下额外渲染行数

/* ========== 响应式状态 ========== */
const inAddr = ref('')
const inValue = ref('')
const inShift = ref('20')
const inProbe = ref(false)
const CUR_TYPE = ref('I32')

const inputbarOpen = ref(true)
const toolbarOpen = ref(false)
const mtShow = ref(false)
const statusText = ref('就绪')
const hitCount = ref(0)

const inSetVal = ref('')
const LAST_DATA = shallowRef(null)
const scanning = ref(false)

const toastVisible = ref(false)
const toastMsg = ref('')

/* ========== 虚拟滚动状态 ========== */
const scrollTop = ref(0)
const scrollTopPx = ref(0)   // 用于 scroll-view 受控滚动（一般不用，设为 0 即可）
const viewportHeight = ref(300)

// 全量数据（含 _checked / _idx / _top）
const allItems = shallowRef([])
// 全局勾选集合（只记 idx，O(1) 增删）
const checkedSet = new Set()
// 已选中数量（响应式）
const selectedCount = ref(0)

// 行高度：多类型展开时每行更高
const itemHeight = computed(() => ITEM_BASE_HEIGHT + (mtShow.value ? ITEM_MT_EXTRA : 0))

// 总高度
const totalHeightPx = computed(() => allItems.value.length * itemHeight.value)

// 可见项（虚拟滚动核心）
const visibleItems = computed(() => {
    const total = allItems.value.length
    if (total === 0) return []
    const h = itemHeight.value
    const start = Math.max(0, Math.floor(scrollTop.value / h) - OVERSCAN)
    const end = Math.min(total, Math.ceil((scrollTop.value + viewportHeight.value) / h) + OVERSCAN)
    const out = []
    for (let i = start; i < end; i++) out.push(allItems.value[i])
    return out
})

/* ========== toast ========== */
let toastTimer = null
function toast(msg) {
    toastMsg.value = msg
    toastVisible.value = true
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toastVisible.value = false), 1600)
}

/* ========== 工具函数 ========== */
function parseHexAddr(s) {
    s = (s || '').trim().toLowerCase()
    if (!s) throw new Error('地址为空')
    if (s.startsWith('0x')) s = s.slice(2)
    if (/^\d+$/.test(s)) return BigInt(s)
    const h = s.replace(/[^0-9a-f]/g, '')
    if (!h) throw new Error('地址非法')
    return BigInt('0x' + h)
}
function fmtAddr(bn) { return '0x' + bn.toString(16).toUpperCase() }
function signedOffset(c, a) { return a - c }
function fmtOffset(diff, step) {
    const sign = diff < 0n ? '-' : '+'
    const abs = diff < 0n ? -diff : diff
    return { dec: sign + abs.toString(), hex: sign + '0x' + abs.toString(16).toUpperCase(), slots: (diff / step).toString() }
}
function safeRead(addrBN, type) {
    try {
        const v = h5gg.getValue(fmtAddr(addrBN), type)
        if (v === null || v === undefined || v === '') return { ok: false }
        return { ok: true, value: v }
    } catch (e) { return { ok: false } }
}
function safeWrite(addrBN, valStr, type) {
    try { return h5gg.setValue(fmtAddr(addrBN), valStr, type) === true } catch (e) { return false }
}
function readAllTypes(addrBN, primaryType) {
    const out = { primary: null, types: {} }
    const prim = safeRead(addrBN, primaryType)
    if (prim.ok) {
        out.primary = primaryType === 'F32' || primaryType === 'F64'
            ? parseFloat(Number(prim.value).toFixed(4))
            : Number(prim.value)
    }
    ALL_TYPES.forEach(t => {
        if (t === primaryType) { out.types[t] = out.primary; return }
        const r = safeRead(addrBN, t)
        if (!r.ok) { out.types[t] = null; return }
        const n = Number(r.value)
        out.types[t] = (t === 'F32' || t === 'F64') ? parseFloat(n.toFixed(4)) : n
    })
    return out
}
function h5gg_getTolerance() { return window.__floatTol || 0.001 }
function buildMatcher(rawValue, type) {
    const isFloat = (type === 'F32' || type === 'F64')
    if (rawValue.indexOf('~') > -1) {
        const p = rawValue.split('~').map(s => Number(s.trim()))
        const lo = p[0], hi = p[1]
        if (isFloat) { const eps = Number(h5gg_getTolerance()); return v => (v >= lo - eps) && (v <= hi + eps) }
        return v => v >= lo && v <= hi
    }
    const target = Number(rawValue)
    if (isFloat) { const eps = Number(h5gg_getTolerance()); return v => Math.abs(v - target) <= eps }
    return v => v === target
}
function formatMt(v, t) {
    if (v === null) return '不可读'
    if (typeof v === 'number' && (t === 'F32' || t === 'F64')) return v.toFixed(4)
    return v
}

/* ========== 滚动处理（rAF 节流） ========== */
let scrollRaf = null
let pendingScrollTop = 0
function onScroll(e) {
    pendingScrollTop = e.detail.scrollTop
    if (scrollRaf) return
    scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null
        scrollTop.value = pendingScrollTop
    })
}

/* ========== 核心扫描 ========== */
function scanNearby(centerBN, type, shift, opts) {
    const size = TYPE_SIZE[type], step = BigInt(size)
    const radius = 1n << BigInt(shift)
    const start = centerBN - radius
    const span = radius * 2n
    const totalSlots = Number(span / step)
    const chunkSize = opts.chunkSize || 8192
    const yieldEvery = opts.yieldEvery || 6
    const matcher = opts.matcher
    const doProbe = !!opts.probe
    const onProgress = opts.onProgress || null
    const matches = []

    return new Promise((resolve) => {
        let slotIdx = 0, scanned = 0, errors = 0, hitProbe = 0
        const t0 = performance.now()
        function runChunk() {
            const lo = slotIdx, hi = Math.min(lo + chunkSize, totalSlots)
            for (let i = lo; i < hi; i++) {
                const addr = start + BigInt(i) * step
                const all = readAllTypes(addr, type)
                scanned++
                if (all.primary === null && all.types[type] === undefined) { errors++; continue }
                const num = all.types[type]
                if (num === null || Number.isNaN(Number(num))) { errors++; continue }
                if (matcher(Number(num))) {
                    const off = signedOffset(centerBN, addr), foff = fmtOffset(off, step)
                    let permInfo = { perm: 'unknown' }
                    if (doProbe) {
                        const r = safeRead(addr, type)
                        if (r.ok) {
                            const orig = r.value, backup = Number(orig)
                            const probeVal = (type === 'F32' || type === 'F64')
                                ? (backup + 1.234).toString()
                                : (backup + 1).toString()
                            let writable = false
                            if (safeWrite(addr, probeVal, type)) {
                                const after = safeRead(addr, type)
                                if (after.ok && Number(after.value) === Number(probeVal)) writable = true
                            }
                            safeWrite(addr, orig, type)
                            permInfo = { perm: writable ? 'rw' : 'ro', writable }
                            if (writable) hitProbe++
                        } else permInfo = { perm: 'na', writable: false }
                    } else permInfo = { perm: 'ro', writable: false }
                    matches.push({
                        address: fmtAddr(addr),
                        value: Number(num),
                        type,
                        offset: foff.dec,
                        offsetHex: foff.hex,
                        offsetSlots: foff.slots,
                        perm: permInfo.perm,
                        writable: permInfo.writable,
                        types: all.types
                    })
                }
            }
            slotIdx = hi
            if (slotIdx < totalSlots) {
                if (onProgress && (slotIdx / chunkSize) % yieldEvery === 0) {
                    onProgress(slotIdx / totalSlots, scanned, matches.length, errors, hitProbe)
                }
                setTimeout(runChunk, 0)
            } else {
                const ms = performance.now() - t0
                resolve({ matches, stats: { scanned, totalSlots, errors, hitProbe, ms, opsPerSec: Math.round(scanned / (ms / 1000)), shift } })
            }
        }
        runChunk()
    })
}

/* ========== 渲染逻辑 ========== */
function renderResults(data) {
    const { matches, stats } = data
    hitCount.value = matches.length
    checkedSet.clear()
    selectedCount.value = 0

    if (matches.length === 0) {
        allItems.value = []
        triggerRef(allItems)
        statusText.value = `未命中 · 扫描 ${stats.scanned} 槽 · 异常 ${stats.errors} · ${stats.ms.toFixed(0)}ms`
        return
    }

    const h = itemHeight.value
    const show = matches.slice(0, MAX_RENDER)
    const arr = show.map((m, i) => ({
        ...m,
        _idx: i,
        _checked: false,
        _top: i * h
    }))
    allItems.value = arr
    triggerRef(allItems)
    scrollTop.value = 0
    scrollTopPx.value = 0
    statusText.value = `完成 · 2^${stats.shift} · ${stats.scanned}槽 · 命中${matches.length} · ${stats.ms.toFixed(0)}ms · ${stats.opsPerSec}/s`
}

/* ========== 勾选（O(1)，只影响 1 行） ========== */
function onCheck(item) {
    const idx = item._idx
    if (checkedSet.has(idx)) {
        checkedSet.delete(idx)
        item._checked = false
    } else {
        checkedSet.add(idx)
        item._checked = true
    }
    // 只触发该行更新：直接改 allItems 里的对象 + triggerRef
    // 因为 allItems 是 shallowRef，改内部对象不会自动触发，需 triggerRef
    // 但虚拟滚动只渲染可见行，diff 量 = 可见行数（~40），不是 5000
    triggerRef(allItems)
    selectedCount.value = checkedSet.size
}

/* ========== 全选 / 反选 / 清空 ========== */
function setAllChecks(v) {
    const arr = allItems.value
    for (let i = 0; i < arr.length; i++) {
        arr[i]._checked = v
        if (v) checkedSet.add(i)
        else checkedSet.delete(i)
    }
    triggerRef(allItems)
    selectedCount.value = checkedSet.size
}
function toggleAllChecks() {
    const arr = allItems.value
    for (let i = 0; i < arr.length; i++) {
        const newVal = !arr[i]._checked
        arr[i]._checked = newVal
        if (newVal) checkedSet.add(i)
        else checkedSet.delete(i)
    }
    triggerRef(allItems)
    selectedCount.value = checkedSet.size
}

/* ========== 多类型切换：重算 _top ========== */
function toggleMultiType() {
    mtShow.value = !mtShow.value
    const h = itemHeight.value
    const arr = allItems.value
    for (let i = 0; i < arr.length; i++) arr[i]._top = i * h
    triggerRef(allItems)
}

/* ========== 刷新值 ========== */
async function refreshAll() {
    if (!LAST_DATA.value || LAST_DATA.value.matches.length === 0) { toast('没有可刷新的结果'); return }
    const mArr = LAST_DATA.value.matches
    const total = mArr.length
    const t0 = performance.now()
    let ok = 0, fail = 0
    await new Promise(resolve => {
        let i = 0
        const CHUNK = 2000
        function step() {
            const end = Math.min(i + CHUNK, total)
            for (; i < end; i++) {
                const m = mArr[i]
                const all = readAllTypes(parseHexAddr(m.address), m.type)
                m.value = all.primary !== null ? all.primary : Number(m.types[m.type] || 0)
                m.types = all.types
                if (all.primary === null) fail++; else ok++
            }
            if (i < total) setTimeout(step, 0)
            else resolve()
        }
        step()
    })
    renderResults(LAST_DATA.value)
    toast(`已刷新 ${total} 个地址 · ${(performance.now() - t0).toFixed(0)}ms`)
}
function refreshSafe() { if (LAST_DATA.value) refreshAll() }

/* ========== 复制 ========== */
function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(() => toast('已复制')).catch(() => fallbackCopy(t))
    } else fallbackCopy(t)
}
function fallbackCopy(t) {
    const ta = document.createElement('textarea')
    ta.value = t
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); toast('已复制') } catch (e) { toast('复制失败') }
    document.body.removeChild(ta)
}
function onCopyJson() {
    if (!LAST_DATA.value || LAST_DATA.value.matches.length === 0) { toast('没有可复制的结果'); return }
    copyText(JSON.stringify(LAST_DATA.value, null, 2))
}

/* ========== 批量赋值 ========== */
function applyValues() {
    const valRaw = String(inSetVal.value || '').trim()
    if (!valRaw) { toast('请填写要赋的值'); return }
    if (checkedSet.size === 0) { toast('请先勾选要赋值的地址'); return }
    const type = CUR_TYPE.value
    const isFloat = (type === 'F32' || type === 'F64')
    let writeVal = valRaw
    if (isFloat) {
        const f = parseFloat(valRaw)
        if (Number.isNaN(f)) { toast('浮点数值非法'); return }
        writeVal = f.toString()
    } else {
        const n = Number(valRaw)
        if (!Number.isInteger(n)) { toast('请输入整数'); return }
        writeVal = n.toString()
    }
    let ok = 0, fail = 0
    checkedSet.forEach(i => {
        const m = LAST_DATA.value.matches[i]
        if (safeWrite(parseHexAddr(m.address), writeVal, type)) ok++; else fail++
    })
    toast(`赋值完成 · 成功 ${ok} · 失败 ${fail}`)
    refreshAll()
}

/* ========== 扫描入口 ========== */
async function onScan() {
    const aRaw = String(inAddr.value || '').trim()
    const vRaw = String(inValue.value || '').trim()
    const sRaw = String(inShift.value || '20').trim() || '20'
    const doProbe = !!inProbe.value
    if (!aRaw) { toast('请填写内存地址'); return }
    if (!vRaw) { toast('请填写目标数值'); return }

    let center, shift
    try { center = parseHexAddr(aRaw) } catch (e) { toast('地址格式错误'); return }
    shift = parseInt(sRaw, 10)
    if (!(shift >= 0 && shift <= MAX_SHIFT)) { toast('指数范围0~' + MAX_SHIFT); return }

    const type = CUR_TYPE.value
    const matcher = buildMatcher(vRaw, type)
    if (doProbe && Number((2n << BigInt(shift)) / BigInt(TYPE_SIZE[type])) > 200000) {
        if (!confirm('精确权限探测耗时较长，确定继续？')) return
    }

    scanning.value = true
    statusText.value = '扫描中·0%'
    try {
        const data = await scanNearby(center, type, shift, {
            matcher,
            probe: doProbe,
            chunkSize: 8192,
            yieldEvery: 6,
            onProgress: (p, scanned, hits, err, hitProbe) => {
                statusText.value = `扫描中 · ${(p * 100).toFixed(1)}% · 已读${scanned}·命中${hits}` + (hitProbe ? `·可写${hitProbe}` : '')
            }
        })
        LAST_DATA.value = data
        triggerRef(LAST_DATA)
        renderResults(data)
        toast(`命中 ${data.matches.length} 个地址`)
        if (inputbarOpen.value) inputbarOpen.value = false
    } catch (e) {
        statusText.value = '扫描出错: ' + e.message
    } finally {
        scanning.value = false
    }
}
function onScanSafe() { if (!scanning.value) onScan() }

/* ========== 返回 ========== */
const emit = defineEmits(['back'])
function onBack() {
    emit('back')
}

/* ========== 挂载 ========== */
onMounted(() => {
    try { h5gg.setFloatTolerance('0.001') } catch (e) { }
    // 测量可见区高度
    setTimeout(() => {
        try {
            const q = uni.createSelectorQuery()
            q.select('.near-list').boundingClientRect(rect => {
                if (rect && rect.height) viewportHeight.value = rect.height
            }).exec()
        } catch (e) { }
    }, 100)
})
</script>

<style scoped>
/* ==========================================================
   基础层
   ========================================================== */
.near-app {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #0b0e14;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro", Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
}

.near-app *,
.near-app *::before,
.near-app *::after {
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

/* ==========================================================
   返回条
   ========================================================== */
.back-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    background: rgba(20, 24, 33, .72);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    flex-shrink: 0;
}

.back-title {
    color: #8b98a9;
    font-size: 12px;
    font-weight: 600;
}

.back-total {
    color: #7CFFB2;
    font-size: 11px;
    font-weight: 600;
}

/* ==========================================================
   折叠面板（无 max-height 过渡，v-show 直接显隐）
   ========================================================== */
.near-inputbar {
    background: rgba(20, 24, 33, .72);
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    overflow: hidden;
    flex-shrink: 0;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    user-select: none;
    min-height: 36px;
}

.panel-header:active {
    background: rgba(255, 255, 255, .04);
}

.panel-title {
    font-size: 12px;
    color: #8b98a9;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
}

.panel-toggle {
    font-size: 11px;
    color: #5ad1ff;
    padding: 2px 8px;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 6px;
}

.panel-body {
    padding: 0 12px 10px 12px;
}

/* ==========================================================
   行
   ========================================================== */
.near-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
    flex-wrap: wrap;
}

.near-row:last-child {
    margin-bottom: 0;
}

.near-label {
    color: #8b98a9;
    font-size: 11px;
    min-width: 48px;
    flex: none;
}

/* ==========================================================
   input
   ========================================================== */
.near-input {
    flex: 1;
    min-width: 110px;
    height: 32px;
    background: rgba(0, 0, 0, .35);
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 9px;
    padding: 0 9px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    overflow: hidden;
}

:deep(.near-input input) {
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: #e6edf3 !important;
    font-size: 13px !important;
    font-family: ui-monospace, Menlo, monospace !important;
    padding: 0 !important;
    height: 100% !important;
    width: 100% !important;
    line-height: normal !important;
}

:deep(.near-input .uni-input-wrapper) {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    background: transparent;
    border: none;
}

:deep(.near-input .uni-input-input) {
    background: transparent !important;
    border: none !important;
    outline: none !important;
    color: #e6edf3 !important;
    font-size: 13px !important;
    font-family: ui-monospace, Menlo, monospace !important;
    padding: 0 !important;
    height: 100% !important;
    width: 100% !important;
}

:deep(.near-input .uni-input-placeholder) {
    color: #5a6472 !important;
    font-size: 13px !important;
}

/* ==========================================================
   类型段按钮
   ========================================================== */
.seg {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.seg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, .05);
    border: 1px solid rgba(255, 255, 255, .08);
    color: #8b98a9;
    border-radius: 8px;
    padding: 6px 9px;
    font-size: 12px;
    line-height: 1;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.seg-btn.on {
    background: #5ad1ff;
    color: #001018;
    border-color: transparent;
    font-weight: 600;
}

/* ==========================================================
   主按钮
   ========================================================== */
.near-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #39b7ff, #5ad1ff);
    color: #001018;
    border-radius: 10px;
    padding: 9px 14px;
    font-weight: 700;
    font-size: 13px;
    line-height: 1;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    flex: none;
}

.near-btn.ghost {
    background: rgba(255, 255, 255, .06);
    color: #e6edf3;
}

.near-btn.danger {
    background: linear-gradient(135deg, #ff9f7a, #ff7a7a);
}

.near-btn.small {
    padding: 5px 10px;
    font-size: 11px;
}

.near-btn:active {
    transform: scale(.97);
}

.near-btn.disabled {
    opacity: .5;
    pointer-events: none;
}

/* ==========================================================
   精确权限探测开关
   ========================================================== */
.opt {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #8b98a9;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.mini-chk {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, .3);
    background: rgba(0, 0, 0, .35);
    position: relative;
    flex: none;
    box-sizing: border-box;
}

.mini-chk.on {
    background: #5ad1ff;
    border-color: #5ad1ff;
}

.mini-chk.on::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 5px;
    height: 9px;
    border: solid #001018;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    box-sizing: border-box;
}

/* ==========================================================
   状态栏
   ========================================================== */
.status {
    padding: 6px 12px;
    font-size: 11px;
    color: #8b98a9;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    min-height: 26px;
    font-family: ui-monospace, monospace;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.toggle-link {
    color: #5ad1ff;
    cursor: pointer;
    font-size: 11px;
    user-select: none;
}

/* ==========================================================
   工具栏
   ========================================================== */
.near-toolbar {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    overflow: hidden;
    flex-shrink: 0;
}

.near-toolbar .near-input {
    min-width: 140px;
    flex: 1;
}

.sel-info {
    font-size: 11px;
    color: #5ad1ff;
    flex: none;
}

/* ==========================================================
   结果头
   ========================================================== */
.result-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 12px;
    color: #8b98a9;
    border-bottom: 1px solid rgba(255, 255, 255, .08);
    flex-shrink: 0;
}

.hit-count {
    color: #7CFFB2;
    font-weight: 700;
    font-size: 14px;
}

/* ==========================================================
   结果列表（虚拟滚动）
   ========================================================== */
.near-list {
    flex: 1;
    height: 0;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    padding: 4px 0;
    position: relative;
}

.list-spacer {
    position: relative;
    width: 100%;
}

.empty {
    padding: 40px 12px;
    text-align: center;
    color: #8b98a9;
    font-size: 13px;
}

.more-tip {
    padding: 14px;
    text-align: center;
    color: #8b98a9;
    font-size: 12px;
}

/* 行：绝对定位，虚拟滚动用 */
.item {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, .04);
    font-family: ui-monospace, Menlo, monospace;
    flex-wrap: wrap;
    height: 30px;
    min-height: 30px;
}

.item.sel {
    background: rgba(90, 209, 255, .10);
}

/* 行内勾选（自绘） */
.item .chk {
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, .3);
    background: rgba(0, 0, 0, .35);
    position: relative;
    cursor: pointer;
    box-sizing: border-box;
}

.item .chk.on {
    background: #5ad1ff;
    border-color: #5ad1ff;
}

.item .chk.on::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 2px;
    width: 5px;
    height: 10px;
    border: solid #001018;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    box-sizing: border-box;
}

.item .idx {
    color: #8b98a9;
    width: 46px;
    flex: none;
    font-size: 11px;
}

.item .addr {
    flex: 1;
    min-width: 160px;
    color: #5ad1ff;
    word-break: break-all;
    font-size: 13px;
}

.item .val {
    color: #7CFFB2;
    font-weight: 600;
    min-width: 80px;
    font-size: 13px;
}

.item .off {
    color: #c9a0ff;
    font-size: 11px;
    min-width: 190px;
}

.item .perm {
    flex: none;
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 700;
    line-height: 1.4;
}

.item .perm.rw {
    background: rgba(124, 255, 178, .15);
    color: #7CFFB2;
}

.item .perm.ro {
    background: rgba(255, 209, 102, .15);
    color: #ffd166;
}

.item .perm.na {
    background: rgba(255, 122, 122, .15);
    color: #ff7a7a;
}

.item .cp {
    color: #8b98a9;
    font-size: 11px;
    padding: 3px 7px;
    border: 1px solid rgba(255, 255, 255, .08);
    border-radius: 7px;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.item .cp:active {
    background: rgba(255, 255, 255, .06);
}

/* ==========================================================
   多类型小字
   ========================================================== */
.multitype {
    flex-basis: 100%;
    padding: 3px 0 3px 78px;
    display: none;
    flex-wrap: wrap;
    gap: 6px 14px;
}

.multitype.show {
    display: flex;
}

.mt-item {
    font-size: 8px;
    color: #8b98a9;
    line-height: 1.4;
}

.mt-item .t {
    color: #5ad1ff;
    font-weight: 600;
    margin-right: 2px;
}

.mt-item.bad .v {
    color: #ff7a7a;
}

.mt-item .v {
    color: #e6edf3;
}

/* ==========================================================
   toast
   ========================================================== */
.toast {
    position: fixed;
    left: 50%;
    bottom: 30px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, .82);
    color: #fff;
    padding: 9px 16px;
    border-radius: 20px;
    font-size: 12px;
    opacity: 0;
    transition: opacity .25s;
    pointer-events: none;
    z-index: 99;
    max-width: 80%;
}

.toast.show {
    opacity: 1;
}
</style>