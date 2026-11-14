<template>
    <view id="subGroupView">
        <!-- 大跳 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-person-running"></text>
                <text>角色大跳</text>
            </view>
            <view class="slider-wrap">
                <slider class="speed-slider" :value="bigJumpValue" @changing="onBigJumpChanging"
                    @change="onBigJumpChange" min="1" max="20" step="0.1" activeColor="#FFD966"
                    backgroundColor="rgba(0,0,0,0.15)" block-color="#FFF9E8" block-size="18" />
                <text class="speed-label">{{ bigJumpValue.toFixed(1) }}</text>
            </view>
        </view>

        <!-- 人物发光 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-lightbulb"></text>
                <text>人物发光</text>
            </view>
            <view class="slider-wrap">
                <slider class="speed-slider" :value="glowValue" @changing="onGlowChanging" @change="onGlowChange"
                    min="1.0" max="1000" activeColor="#FFD966" backgroundColor="rgba(0,0,0,0.15)" block-color="#FFF9E8"
                    block-size="18" />
                <text class="speed-label">{{ glowValue.toFixed(1) }}</text>
            </view>
        </view>

        <!-- 修改光翼 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-regular fa-feather"></text>
                <text>修改光翼</text>
            </view>
            <button class="sky-btn" @click="xgjr">执行</button>
        </view>
        <!-- 高危炸翼 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-skull"></text>
                <text>高危炸翼</text>
            </view>
            <button class="sky-btn" @click="zhayi">执行</button>
        </view>

        <!-- 能量护盾 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-shield"></text>
                <text>能量护盾</text>
            </view>
            <button class="sky-btn" @click="openShieldPanel">配置</button>
        </view>

        <!-- 特征魔法 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-wand-sparkles"></text>
                <text>特征魔法</text>
            </view>
            <button class="sky-btn" @click="openMagicPanel" @touchstart.stop>配置</button>
        </view>

        <!-- 变成无翼 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-infinity"></text>
                <text>变成无翼</text>
            </view>
            <switch :checked="swState.wy" color="#FFD966" style="transform: scale(0.75)" @change="onchangeWY" />
        </view>

        <!-- 无限能量 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-bolt"></text>
                <text>无限能量</text>
            </view>
            <switch :checked="swState.energy" color="#FFD966" style="transform: scale(0.75)" @change="onEnergy" />
        </view>

        <!-- 隐身 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-eye-slash"></text>
                <text>隐身</text>
            </view>
            <switch :checked="swState.invisible" color="#FFD966" style="transform: scale(0.75)"
                @change="onInvisible" />
        </view>

        <!-- 守护无翼 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-feather"></text>
                <text>守护无翼</text>
            </view>
            <switch :checked="swState.noWingGuard" color="#FFD966" style="transform: scale(0.75)"
                @change="onNoWingGuard" />
        </view>

        <!-- 防举报 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-shield-halved"></text>
                <text>防举报</text>
            </view>
            <switch :checked="swState.antiReport" color="#FFD966" style="transform: scale(0.75)"
                @change="onAntiReport" />
        </view>

        <!-- 解锁好友树 -->
        <view class="sky-task">
            <view class="task-left">
                <text class="fa-solid fa-user-group"></text>
                <text>解锁好友树</text>
            </view>
            <switch :checked="swState.friendTree" color="#FFD966" style="transform: scale(0.75)"
                @change="onFriendTree" />
        </view>

        <!-- ============ 能量盾弹窗 ============ -->
        <view v-if="shieldVisible" class="shield-mask" @click="closeShieldPanel">
            <view class="shield-panel" @click.stop>
                <view class="shield-header">
                    <text class="shield-title">全局能量盾</text>
                    <text class="shield-close" @click="closeShieldPanel">✕</text>
                </view>

                <view class="shield-tabs">
                    <view class="shield-tab" :class="{ active: shieldTab === 'one' }" @click="shieldTab = 'one'">界面
                    </view>
                    <view class="shield-tab" :class="{ active: shieldTab === 'dev' }" @click="shieldTab = 'dev'">开发者
                    </view>
                </view>

                <view v-show="shieldTab === 'one'" class="shield-body">
                    <view class="shield-status">
                        <view class="status-dot" :class="shieldReady ? 'online' : 'offline'"></view>
                        <text class="status-text">{{ shieldReady ? '已初始化' : '未初始化' }}</text>
                        <button class="status-btn" :class="{ loading: initLoading, done: shieldReady }"
                            :disabled="initLoading" @click="initShield">
                            {{ initLoading ? '初始化中...' : (shieldReady ? '重新初始化' : '初始化') }}
                        </button>
                    </view>

                    <view class="shield-quick">
                        <button class="quick-btn" @click="quickAll('main', true)">全开盾</button>
                        <button class="quick-btn danger" @click="quickAll('main', false)">全关盾</button>
                        <button class="quick-btn" @click="quickAll('other', true)">全开它人炸</button>
                        <button class="quick-btn danger" @click="quickAll('other', false)">全关它人炸</button>
                    </view>

                    <view class="player-grid">
                        <view v-for="n in 8" :key="'p' + n" class="player-card" :class="{ self: n === 1 }">
                            <view class="player-title">{{ n === 1 ? '自身' : '玩家' + n }}</view>

                            <view class="btn-row">
                                <text class="btn-label">能量盾</text>
                                <button class="toggle-btn" :class="states.main[n - 1] ? 'on' : 'off'"
                                    :disabled="!shieldReady" @click="toggle('main', n - 1)">{{ states.main[n - 1] ?
                                        '开'
                                        : '关' }}</button>
                            </view>
                            <view class="btn-row">
                                <text class="btn-label">它人炸</text>
                                <button class="toggle-btn" :class="states.other[n - 1] ? 'on' : 'off'"
                                    :disabled="!shieldReady" @click="toggle('other', n - 1)">{{ states.other[n - 1]
                                        ?
                                        '开' : '关' }}</button>
                            </view>
                            <view class="btn-row">
                                <text class="btn-label">自身炸</text>
                                <button class="toggle-btn" :class="states.self[n - 1] ? 'on' : 'off'"
                                    :disabled="!shieldReady" @click="toggle('self', n - 1)">{{ states.self[n - 1] ?
                                        '开'
                                        : '关' }}</button>
                            </view>
                        </view>
                    </view>
                </view>

                <view v-show="shieldTab === 'dev'" class="shield-body dev-body">
                    <view class="dev-row">
                        <text class="dev-label">基准地址</text>
                        <text class="dev-value">{{ fmtAddr(baseAddr) }}</text>
                        <button class="mini-copy" @click="copyAddr(baseAddr)">复制</button>
                    </view>
                    <view class="dev-row">
                        <text class="dev-label">自身能量盾</text>
                        <text class="dev-value">{{ fmtAddr(mainAddrList[0]) }}</text>
                        <button class="mini-copy" @click="copyAddr(mainAddrList[0])">复制</button>
                    </view>
                    <view class="dev-row">
                        <text class="dev-label">自身 · 它人炸</text>
                        <text class="dev-value">{{ fmtAddr(otherAddrList[0]) }}</text>
                        <button class="mini-copy" @click="copyAddr(otherAddrList[0])">复制</button>
                    </view>
                    <view class="dev-row">
                        <text class="dev-label">自身 · 自身炸</text>
                        <text class="dev-value">{{ fmtAddr(selfAddrList[0]) }}</text>
                        <button class="mini-copy" @click="copyAddr(selfAddrList[0])">复制</button>
                    </view>
                    <template v-for="n in 7" :key="'dev' + n">
                        <view class="dev-row">
                            <text class="dev-label">玩家{{ n + 1 }}能量盾</text>
                            <text class="dev-value">{{ fmtAddr(mainAddrList[n]) }}</text>
                            <button class="mini-copy" @click="copyAddr(mainAddrList[n])">复制</button>
                        </view>
                        <view class="dev-row">
                            <text class="dev-label">玩家{{ n + 1 }}它人炸</text>
                            <text class="dev-value">{{ fmtAddr(otherAddrList[n]) }}</text>
                            <button class="mini-copy" @click="copyAddr(otherAddrList[n])">复制</button>
                        </view>
                        <view class="dev-row">
                            <text class="dev-label">玩家{{ n + 1 }}自身炸</text>
                            <text class="dev-value">{{ fmtAddr(selfAddrList[n]) }}</text>
                            <button class="mini-copy" @click="copyAddr(selfAddrList[n])">复制</button>
                        </view>
                    </template>
                </view>
            </view>
        </view>

        <!-- ============ 魔法弹窗 ============ -->
        <view v-if="magicVisible" class="shield-mask" @click="closeMagicPanel">
            <view class="shield-panel" @click.stop>
                <view class="shield-header">
                    <text class="shield-title">特征魔法</text>
                    <text class="shield-close" @click="closeMagicPanel">✕</text>
                </view>

                <view class="shield-tabs">
                    <view class="shield-tab" :class="{ active: magicTab === 'func' }" @click="magicTab = 'func'">功能
                    </view>
                    <view class="shield-tab" :class="{ active: magicTab === 'addr' }" @click="magicTab = 'addr'">地址
                    </view>
                </view>

                <view v-show="magicTab === 'func'" class="shield-body">
                    <view class="shield-status">
                        <view class="status-dot" :class="magicReady ? 'online' : 'offline'"></view>
                        <text class="status-text">{{ magicReady ? '已初始化' : '未初始化' }}</text>
                        <button class="status-btn" :class="{ loading: magicInitLoading, done: magicReady }"
                            :disabled="magicInitLoading" @click="initMagicPanel">
                            {{ magicInitLoading ? '初始化中...' : (magicReady ? '重新初始化' : '初始化') }}
                        </button>
                        <button class="quick-btn danger" @click="quickCloseAllMagic">全部关闭</button>
                    </view>

                    <scroll-view class="magic-scroll" scroll-y>
                        <template v-for="slot in SLOT_TOTAL" :key="'slot' + slot">
                            <view class="magic-group" @click="toggleSlotFold(slot)">
                                <view class="magic-group-left">
                                    <text class="fold-arrow" :class="{ open: isSlotOpen(slot) }">▶</text>
                                    <text class="magic-group-title">{{ magicSlotTitles[slot - 1] }}</text>
                                    <text v-if="magicState[slot] !== null" class="magic-group-on">●</text>
                                </view>
                                <text class="magic-group-count">{{ magicItems[slot].length }}</text>
                            </view>

                            <view v-show="isSlotOpen(slot)" class="magic-grid">
                                <view v-for="(item, idx) in magicItems[slot]" :key="slot + '_' + idx" class="magic-cell"
                                    :class="{ on: magicState[slot] === item.id }" @click="toggleMagicSlot(slot, item)">
                                    <view class="magic-icon">
                                        <text class="fa-solid fa-wand-magic-sparkles"></text>
                                    </view>
                                    <text class="magic-cell-name">{{ item.name }}</text>
                                </view>
                            </view>
                        </template>
                    </scroll-view>
                </view>

                <view v-show="magicTab === 'addr'" class="shield-body dev-body">
                    <view class="dev-row">
                        <text class="dev-label">卡槽数量</text>
                        <text class="dev-value">{{ fmtMagicAddr(magicCountAddr) }}</text>
                        <button class="mini-copy" @click="copyMagicAddr(magicCountAddr)">复制</button>
                    </view>

                    <template v-for="row in magicAddrList" :key="'addr' + row.slot">
                        <view class="dev-row">
                            <text class="dev-label">槽{{ row.slot }} · 魔法ID</text>
                            <text class="dev-value">{{ fmtMagicAddr(row.id) }}</text>
                            <button class="mini-copy" @click="copyMagicAddr(row.id)">复制</button>
                        </view>
                        <view class="dev-row">
                            <text class="dev-label">槽{{ row.slot }} · 时间</text>
                            <text class="dev-value">{{ fmtMagicAddr(row.time) }}</text>
                            <button class="mini-copy" @click="copyMagicAddr(row.time)">复制</button>
                        </view>
                        <view class="dev-row">
                            <text class="dev-label">槽{{ row.slot }} · 开关</text>
                            <text class="dev-value">{{ fmtMagicAddr(row.switchAddr) }}</text>
                            <button class="mini-copy" @click="copyMagicAddr(row.switchAddr)">复制</button>
                        </view>
                    </template>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import {onUnmounted, reactive, ref} from 'vue'
import {
  clearBigJumpAddr,
  clearWingBurstAddr,
  setBigJump,
  setPlayerGlow,
  setWingBurst,
  setWingCount,
  setWY,
  stopBigJumpLoop
} from '@/common/h5gg.js'

import {
  fmtAddr,
  getAllStates,
  getBaseAddr,
  getMainAddrList,
  getOtherAddrList,
  getSelfAddrList,
  initEnergyShield,
  isInitialized,
  setAllEnergyShield,
  setEnergyShield,
  stopAllEnergyShield
} from '@/common/energyShield.js'

import {
  closeAllMagic,
  fmtAddr as fmtMagicAddr,
  getMagicAddrList,
  getMagicCountAddr,
  getSlotState,
  initMagic,
  isMagicInitialized,
  toggleMagic
} from '@/common/magic.js'

import {MAGIC_ITEMS, MAGIC_ITEMS_Length, MAGIC_SLOT_TITLES} from '@/common/magicData_all.js'

import {
  antiReportLoop,
  energyLoopV2,
  friendTreeLoop,
  invisibleLoop,
  noWingGuardLoop,
  stopAllEntertainment
} from '@/common/entertainment.js'

// ===== 开关状态 =====
const swState = reactive({
    wy: false,
    energy: false,
    invisible: false,
    noWingGuard: false,
    antiReport: false,
    friendTree: false
})

const glowValue = ref(1.0)
const bigJumpValue = ref(1)

// ===== 魔法状态 =====
const magicVisible = ref(false)
const magicReady = ref(false)
const magicInitLoading = ref(false)
const magicTab = ref('func')
const SLOT_TOTAL = MAGIC_ITEMS_Length
const magicState = reactive({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null })
const magicCountAddr = ref(null)
const magicAddrList = ref([])
const magicSlotTitles = MAGIC_SLOT_TITLES
const magicItems = MAGIC_ITEMS
const openSlots = reactive({ 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false })
let lastOpenSlot = 1

// ===== 能量盾状态 =====
const shieldVisible = ref(false)
const shieldReady = ref(false)
const initLoading = ref(false)
const states = reactive({
    main: new Array(8).fill(false),
    other: new Array(8).fill(false),
    self: new Array(8).fill(false)
})
const shieldTab = ref('one')
const baseAddr = ref(null)
const mainAddrList = ref(new Array(8).fill(null))
const otherAddrList = ref(new Array(8).fill(null))
const selfAddrList = ref(new Array(8).fill(null))

function refreshStates() {
    const s = getAllStates()
    states.main.splice(0, states.main.length, ...s.main)
    states.other.splice(0, states.other.length, ...s.other)
    states.self.splice(0, states.self.length, ...s.self)
    baseAddr.value = getBaseAddr()
    mainAddrList.value = getMainAddrList()
    otherAddrList.value = getOtherAddrList()
    selfAddrList.value = getSelfAddrList()
}

function openShieldPanel() {
    shieldVisible.value = true
    shieldReady.value = isInitialized()
    shieldTab.value = 'one'
    refreshStates()
}

function closeShieldPanel() { shieldVisible.value = false }

function copyAddr(addr) {
    if (addr === null || addr === undefined) {
        uni.showToast({ icon: 'none', title: '能量盾未初始化，无地址', duration: 900 })
        return
    }
    const n = Number(addr)
    if (!Number.isFinite(n) || n <= 0) {
        uni.showToast({ icon: 'none', title: '地址无效', duration: 800 })
        return
    }
    const str = '0x' + n.toString(16)
    uni.setClipboardData({ data: str, success: () => uni.showToast({ icon: 'success', title: '已复制 ' + str, duration: 800 }) })
}

async function initShield() {
    if (initLoading.value) return
    initLoading.value = true
    try {
        await new Promise(r => setTimeout(r, 30))
        const ok = initEnergyShield()
        shieldReady.value = ok
        refreshStates()
        uni.showToast({ icon: 'none', title: ok ? '初始化成功' : '初始化失败', duration: 1200 })
    } finally {
        initLoading.value = false
    }
}

function toggle(type, idx) {
    if (!shieldReady.value) {
        uni.showToast({ icon: 'none', title: '请先初始化', duration: 1000 })
        return
    }
    const next = !states[type][idx]
    const ok = setEnergyShield(type, idx, next)
    if (ok) refreshStates()
    else uni.showToast({ icon: 'none', title: '操作失败', duration: 1000 })
}

function quickAll(type, enabled) {
    if (!shieldReady.value) {
        uni.showToast({ icon: 'none', title: '请先初始化', duration: 1000 })
        return
    }
    setAllEnergyShield(type, enabled)
    refreshStates()
    uni.showToast({ icon: 'none', title: enabled ? '已全部开启' : '已全部关闭', duration: 800 })
}

// ===== 魔法函数 =====
function refreshMagicState() {
    const s = getSlotState()
    for (let i = 1; i <= SLOT_TOTAL; i++) magicState[i] = s[i]
    magicCountAddr.value = getMagicCountAddr()
    magicAddrList.value = getMagicAddrList()
}

function isSlotOpen(slot) { return !!openSlots[slot] }

function toggleSlotFold(slot) {
    openSlots[slot] = !openSlots[slot]
    if (openSlots[slot]) lastOpenSlot = slot
}

function openMagicPanel() {
    magicVisible.value = true
    magicReady.value = isMagicInitialized()
    magicTab.value = 'func'
    for (let s = 1; s <= SLOT_TOTAL; s++) openSlots[s] = false
    openSlots[lastOpenSlot] = true
    refreshMagicState()
}

function closeMagicPanel() { magicVisible.value = false }

async function initMagicPanel() {
    if (magicInitLoading.value) return
    magicInitLoading.value = true
    try {
        await new Promise(r => setTimeout(r, 30))
        const ok = initMagic()
        magicReady.value = ok
        refreshMagicState()
        uni.showToast({ icon: 'none', title: ok ? '初始化成功' : '初始化失败', duration: 1200 })
    } finally {
        magicInitLoading.value = false
    }
}

function toggleMagicSlot(slot, item) {
    if (!magicReady.value) {
        uni.showToast({ icon: 'none', title: '请先初始化', duration: 1000 })
        return
    }
    const ok = toggleMagic(slot, item)
    if (ok) refreshMagicState()
    else uni.showToast({ icon: 'none', title: '操作失败', duration: 1000 })
}

function quickCloseAllMagic() {
    if (!magicReady.value) {
        uni.showToast({ icon: 'none', title: '请先初始化', duration: 1000 })
        return
    }
    closeAllMagic()
    refreshMagicState()
    uni.showToast({ icon: 'none', title: '已全部关闭', duration: 800 })
}

function copyMagicAddr(addr) {
    if (addr === null || addr === undefined) {
        uni.showToast({ icon: 'none', title: '魔法未初始化，无地址', duration: 900 })
        return
    }
    const n = Number(addr)
    if (!Number.isFinite(n) || n <= 0) {
        uni.showToast({ icon: 'none', title: '地址无效', duration: 800 })
        return
    }
    const str = '0x' + n.toString(16)
    uni.setClipboardData({ data: str, success: () => uni.showToast({ icon: 'success', title: '已复制 ' + str, duration: 800 }) })
}

// ===== 业务函数 =====
async function xgjr() {
    const input = prompt('请输入光翼数量(I32)：', '0')
    if (input === null || input === '') return
    const ok = await setWingCount(input)
    uni.showToast({ icon: ok ? 'success' : 'none', title: ok ? '光翼设置成功' : '光翼设置失败', duration: 1200 })
}

async function zhayi() {
    const input = prompt('炸翼，请输入要写入的I32数值：', '0')
    if (input === null || input === undefined || String(input).trim() === '') return
    const v = Number(input)
    if (!Number.isFinite(v)) {
        uni.showToast({ icon: 'none', title: '请输入有效数字', duration: 1000 })
        return
    }
    const ok = await setWingBurst(v)
    uni.showToast({ icon: ok ? 'success' : 'none', title: ok ? '炸翼已写入' : '炸翼写入失败', duration: 1200 })
}

async function onchangeWY(e) {
    swState.wy = e.detail.value
    const ok = await setWY(swState.wy)
    if (!ok) uni.showToast({ icon: 'none', title: '无翼设置失败', duration: 1200 })
}

function onBigJumpChanging(e) { bigJumpValue.value = e.detail.value }

async function onBigJumpChange(e) {
    bigJumpValue.value = e.detail.value
    const v = parseFloat(bigJumpValue.value)
    if (v >= 1) await setBigJump(v)
    else stopBigJumpLoop()
}

function onGlowChanging(e) { glowValue.value = e.detail.value }
function onGlowChange(e) { glowValue.value = e.detail.value; setPlayerGlow(glowValue.value) }

function onEnergy(e) { swState.energy = e.detail.value; energyLoopV2(e.detail.value) }
function onInvisible(e) { swState.invisible = e.detail.value; invisibleLoop(e.detail.value) }
function onNoWingGuard(e) { swState.noWingGuard = e.detail.value; noWingGuardLoop(e.detail.value) }
function onAntiReport(e) { swState.antiReport = e.detail.value; antiReportLoop(e.detail.value) }
function onFriendTree(e) { swState.friendTree = e.detail.value; friendTreeLoop(e.detail.value) }

onUnmounted(() => {
    stopAllEnergyShield()
    clearWingBurstAddr()
    stopBigJumpLoop()
    clearBigJumpAddr()
    stopAllEntertainment()
})
</script>

<style scoped>
@import './base.css';
</style>