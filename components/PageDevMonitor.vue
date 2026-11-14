<template>
    <view class="dev-monitor">
        <!-- 顶部栏 -->
        <view class="topbar">
            <view class="topbar-left">
                <text class="fa-solid fa-code"></text>
                <text class="title">地址监控</text>
                <text class="badge">{{ stats.ok }}/{{ stats.total }} 有效</text>
            </view>
            <view class="topbar-right">
                <button class="icon-btn refresh" @click="refresh">刷新</button>
                <button class="icon-btn close" @click="close">关闭</button>
            </view>
        </view>

        <!-- 搜索栏 -->
        <view class="searchbar">
            <input class="search-input" v-model="keyword" placeholder="搜索功能名 / key / 地址..." />
            <view class="filter-chips">
                <view class="chip" :class="{ active: filterMode === 'all' }" @click="filterMode = 'all'">全部</view>
                <view class="chip" :class="{ active: filterMode === 'ok' }" @click="filterMode = 'ok'">仅有效</view>
                <view class="chip" :class="{ active: filterMode === 'bad' }" @click="filterMode = 'bad'">仅失效</view>
            </view>
        </view>

        <!-- 内容区 -->
        <scroll-view class="content" scroll-y>
            <view v-if="visibleGroups.length === 0" class="empty">
                <text class="empty-icon">📭</text>
                <text class="empty-text">暂无匹配地址</text>
                <text class="empty-sub">请先在游戏中触发对应功能，地址会自动注册</text>
            </view>

            <view v-for="g in visibleGroups" :key="g.key" class="group">
                <view class="group-header" @click="toggleGroup(g.key)">
                    <text class="fa-solid" :class="g.icon"></text>
                    <text class="group-name">{{ g.name }}</text>
                    <text class="group-count">{{ g.items.length }}</text>
                    <text class="group-arrow" :class="{ open: openGroups[g.key] }">▸</text>
                </view>

                <view v-if="openGroups[g.key]" class="group-body">
                    <view v-for="item in g.items" :key="item.key" class="addr-card" :class="{ bad: !item.ok }">
                        <view class="card-row1">
                            <text class="card-label">{{ item.label }}</text>
                            <text class="card-key">{{ item.key }}</text>
                            <text class="card-type">{{ item.type }}</text>
                            <text class="card-status" :class="item.ok ? 'ok' : 'bad'">{{ item.ok ? '●' : '○' }}</text>
                        </view>
                        <view class="card-row2">
                            <text class="card-hex" @click="copyText(item.hex)">{{ item.hex || '—' }}</text>
                            <button class="copy-btn" @click="copyText(item.hex)" :disabled="!item.hex">复制</button>
                        </view>
                        <view class="card-row3">
                            <text class="card-value-label">值:</text>
                            <text class="card-value"
                                :class="{ 'value-bad': item.value === '' || item.value === undefined || item.value === '0x0' }">
                                {{ (item.value === '' || item.value === undefined || item.value === '0x0') ? '—' :
                                item.value }}
                            </text>
                        </view>
                        <view class="card-row4">
                            <text class="card-desc">{{ item.desc }}</text>
                            <text v-if="item.note" class="card-note">· {{ item.note }}</text>
                            <text class="card-time">{{ fmtTime(item.ts) }}</text>
                        </view>
                        <view v-if="item.history && item.history.length" class="card-history">
                            <text class="history-label">历史:</text>
                            <text v-for="(h, i) in item.history" :key="i" class="history-item"
                                @click="copyText(h.hex)">{{ h.hex }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>
    </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import {
    groupedEntries, stats, GROUPS, refreshValues
} from '@/common/addressRegistry.js'

const keyword = ref('')
const filterMode = ref('all')
const openGroups = reactive({})


// 默认展开所有分组
for (const g in GROUPS) openGroups[g] = true

const visibleGroups = computed(() => {
    const groups = groupedEntries.value
    const kw = keyword.value.trim().toLowerCase()
    const mode = filterMode.value

    const list = []
    for (const g in groups) {
        let items = groups[g]
        if (kw) {
            items = items.filter(it =>
                (it.label || '').toLowerCase().includes(kw) ||
                (it.key || '').toLowerCase().includes(kw) ||
                (it.hex || '').toLowerCase().includes(kw) ||
                (it.desc || '').toLowerCase().includes(kw)
            )
        }
        if (mode === 'ok') items = items.filter(it => it.ok)
        if (mode === 'bad') items = items.filter(it => !it.ok)
        if (items.length === 0) continue
        list.push({ key: g, ...GROUPS[g], items })
    }
    return list
})

function toggleGroup(key) {
    openGroups[key] = !openGroups[key]
}

function copyText(text) {
    if (!text) return
    uni.setClipboardData({
        data: text,
        success: () => uni.showToast({ title: '已复制', icon: 'success', duration: 800 })
    })
}

function fmtTime(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ★ 内存值定时刷新
let refreshTimer = null
const REFRESH_INTERVAL = 1000

function doRefreshValues() {
    if (typeof h5gg === 'undefined') return
    try {
        refreshValues((hex, type) => h5gg.getValue(hex, type))
    } catch (e) { }
}

function refresh() {
    doRefreshValues()
    uni.showToast({ title: '已刷新', icon: 'none', duration: 600 })
}

const emit = defineEmits(['close'])
function close() {
    emit('close')
}

onMounted(() => {
    doRefreshValues()
    refreshTimer = setInterval(doRefreshValues, REFRESH_INTERVAL)
})

onUnmounted(() => {
    if (refreshTimer) {
        clearInterval(refreshTimer)
        refreshTimer = null
    }
})
</script>

<style scoped>
.dev-monitor {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: #0f1620;
    color: #e8eef6;
    font-size: 12px;
    z-index: 99999;
}

/* ===== 顶部栏 ===== */
.topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: linear-gradient(135deg, #1a2332, #243044);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
}

.topbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.topbar-left .title {
    font-size: 14px;
    font-weight: 600;
}

.badge {
    background: rgba(52, 199, 89, 0.18);
    color: #34c759;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-family: monospace;
}

.topbar-right {
    display: flex;
    gap: 6px;
}

.icon-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 12px;
    font-size: 11px;
    line-height: 1;
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
}

.icon-btn::after {
    border: none;
}

.icon-btn.refresh {
    background: #0a84ff;
}

.icon-btn.close {
    background: #ff3b30;
}

/* ===== 搜索栏 ===== */
.searchbar {
    padding: 8px 12px;
    background: #141d2a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
}

.search-input {
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #e8eef6;
    font-size: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-chips {
    display: flex;
    gap: 6px;
}

.chip {
    padding: 3px 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.08);
    color: #a0aec0;
    font-size: 11px;
}

.chip.active {
    background: #FFD966;
    color: #1a2332;
    font-weight: 600;
}

/* ===== 内容区 ===== */
.content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px 20px;
}

.empty {
    text-align: center;
    padding: 60px 20px;
    color: #6b7a8d;
}

.empty-icon {
    font-size: 40px;
    display: block;
    margin-bottom: 10px;
}

.empty-text {
    font-size: 14px;
    display: block;
}

.empty-sub {
    font-size: 11px;
    display: block;
    margin-top: 6px;
    opacity: 0.7;
}

/* ===== 分组 ===== */
.group {
    margin-bottom: 8px;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    font-weight: 600;
}

.group-header .fa-solid {
    color: #FFD966;
    width: 16px;
}

.group-name {
    flex: 1;
    font-size: 13px;
}

.group-count {
    background: rgba(255, 255, 255, 0.1);
    padding: 1px 7px;
    border-radius: 8px;
    font-size: 10px;
    font-family: monospace;
}

.group-arrow {
    transition: transform 0.2s;
    font-size: 10px;
    color: #6b7a8d;
}

.group-arrow.open {
    transform: rotate(90deg);
}

.group-body {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* ===== 地址卡片 ===== */
.addr-card {
    background: rgba(255, 255, 255, 0.04);
    border-left: 3px solid #34c759;
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.addr-card.bad {
    border-left-color: #ff3b30;
    opacity: 0.75;
}

.card-row1 {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.card-label {
    font-size: 13px;
    font-weight: 600;
    color: #e8eef6;
}

.card-key {
    font-family: monospace;
    font-size: 10px;
    color: #6b7a8d;
    background: rgba(255, 255, 255, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
}

.card-type {
    font-family: monospace;
    font-size: 10px;
    color: #FFD966;
    background: rgba(255, 217, 102, 0.12);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: auto;
}

.card-status {
    font-size: 14px;
}

.card-status.ok {
    color: #34c759;
}

.card-status.bad {
    color: #ff3b30;
}

.card-row2 {
    display: flex;
    align-items: center;
    gap: 6px;
}

.card-hex {
    flex: 1;
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 13px;
    color: #0a84ff;
    word-break: break-all;
    letter-spacing: 0.3px;
}

.copy-btn {
    padding: 3px 10px;
    border: 1px solid #0a84ff;
    background: transparent;
    color: #0a84ff;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.2;
}

.copy-btn::after {
    border: none;
}

.copy-btn[disabled] {
    opacity: 0.3;
}

.card-row3 {
    display: flex;
    align-items: center;
    gap: 6px;
}

.card-value-label {
    font-size: 10px;
    color: #6b7a8d;
}

.card-value {
    font-family: monospace;
    font-size: 11px;
    color: #34c759;
    background: rgba(52, 199, 89, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
}

.card-value.value-bad {
    color: #6b7a8d;
    background: rgba(255, 255, 255, 0.04);
}

.card-row4 {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.card-desc {
    font-size: 10px;
    color: #6b7a8d;
    flex: 1;
}

.card-note {
    font-size: 10px;
    color: #ff9500;
}

.card-time {
    font-size: 9px;
    color: #4a5568;
    font-family: monospace;
}

.card-history {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    padding-top: 4px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
}

.history-label {
    font-size: 9px;
    color: #6b7a8d;
}

.history-item {
    font-family: monospace;
    font-size: 9px;
    color: #a0aec0;
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 5px;
    border-radius: 3px;
    text-decoration: line-through;
}
</style>