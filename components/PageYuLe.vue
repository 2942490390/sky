<template>
	<view class="page">
		<!-- 修改光翼 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>修改光翼</text>
			</view>
			<button class="sky-btn" @click="xgjr" >执行</button>
		</view>
		<!-- 设置高度 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>设置高度</text>
			</view>
			<button class="sky-btn" @click="inputGoldF32" >执行</button>
		</view>
		<!-- 能量盾（入口按钮，点击弹出面板） -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-shield"></text>
				<text>能量护盾</text>
			</view>
			<button class="sky-btn" @click="openShieldPanel" >配置</button>
		</view>
		<!-- 无限道具 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-infinity"></text>
				<text>无限道具</text>
			</view>
			<switch :checked="swState.wxdj" color="#FFD966" style="transform: scale(0.75);" @change="wxdj" />
		</view>
		<!-- 无限烟花 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-wand-magic-sparkles"></text>
				<text>无限烟花</text>
			</view>
			<switch :checked="swState.wxyh" color="#FFD966" style="transform: scale(0.75);" @change="wxyh" />
		</view>
		<!-- 高危炸翼 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-skull"></text>
				<text>高危炸翼</text>
			</view>
			<switch :checked="swState.zhayi" color="#FFD966" style="transform: scale(0.75);" @change="zhayi" />
		</view>

		<!-- ============ 能量盾弹窗 ============ -->
		<view v-if="shieldVisible" class="shield-mask" @click="closeShieldPanel">
			<view class="shield-panel" @click.stop>
				<!-- 标题 -->
				<view class="shield-header">
					<text class="shield-title">全局能量盾</text>
					<text class="shield-close" @click="closeShieldPanel">✕</text>
				</view>

				<!-- ★ Tab 切换 -->
				<view class="shield-tabs">
					<view class="shield-tab" :class="{ active: shieldTab === 'one' }" @click="shieldTab = 'one'">界面
					</view>
					<view class="shield-tab" :class="{ active: shieldTab === 'dev' }" @click="shieldTab = 'dev'">开发者
					</view>
				</view>

				<!-- ========== 界面页 ========== -->
				<view v-show="shieldTab === 'one'" class="shield-body">
					<!-- 状态栏 -->
					<view class="shield-status">
						<view class="status-dot" :class="shieldReady ? 'online' : 'offline'"></view>
						<text class="status-text">{{ shieldReady ? '已初始化' : '未初始化' }}</text>
						<button class="status-btn" :class="{ loading: initLoading, done: shieldReady }"
							:disabled="initLoading" @click="initShield">
							{{ initLoading ? '初始化中...' : (shieldReady ? '重新初始化' : '初始化') }}
						</button>
					</view>

					<!-- 快捷操作 -->
					<view class="shield-quick">
						<button class="quick-btn" @click="quickAll('main', true)">全开盾</button>
						<button class="quick-btn danger" @click="quickAll('main', false)">全关盾</button>
						<button class="quick-btn" @click="quickAll('other', true)">全开它人炸</button>
						<button class="quick-btn danger" @click="quickAll('other', false)">全关它人炸</button>
					</view>

					<!-- 4×2 玩家卡片 -->
					<view class="player-grid">
						<view v-for="n in 8" :key="'p' + n" class="player-card" :class="{ self: n === 1 }">
							<view class="player-title">{{ n === 1 ? '自身' : '玩家' + n }}</view>

							<view class="btn-row">
								<text class="btn-label">能量盾</text>
								<button class="toggle-btn" :class="states.main[n - 1] ? 'on' : 'off'"
									:disabled="!shieldReady" @click="toggle('main', n - 1)">{{ states.main[n - 1] ? '开'
										: '关' }}</button>
							</view>

							<view class="btn-row">
								<text class="btn-label">它人炸</text>
								<button class="toggle-btn" :class="states.other[n - 1] ? 'on' : 'off'"
									:disabled="!shieldReady" @click="toggle('other', n - 1)">{{ states.other[n - 1] ?
										'开' : '关' }}</button>
							</view>

							<view class="btn-row">
								<text class="btn-label">自身炸</text>
								<button class="toggle-btn" :class="states.self[n - 1] ? 'on' : 'off'"
									:disabled="!shieldReady" @click="toggle('self', n - 1)">{{ states.self[n - 1] ? '开'
										: '关' }}</button>
							</view>
						</view>
					</view>
				</view>

				<!-- ========== 开发者页 ========== -->
				<view v-show="shieldTab === 'dev'" class="shield-body dev-body">
					<!-- 基准地址 -->
					<view class="dev-row">
						<text class="dev-label">基准地址</text>
						<text class="dev-value">{{ fmtAddr(baseAddr) }}</text>
						<button class="mini-copy" @click="copyAddr(baseAddr)">复制</button>
					</view>

					<!-- 自身 -->
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

					<!-- 玩家2~8 -->
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
	</view>
</template>

<script setup>
import { reactive, ref, onUnmounted } from 'vue'
import {
	fireworkLoop,
	stopFireworkLoop,
	setWingCount,
	setGoldF32,
	setWingBurst
} from '../common/h5gg.js'

import {
	initEnergyShield,
	isInitialized,
	setEnergyShield,
	setAllEnergyShield,
	stopAllEnergyShield,
	getAllStates,
	getBaseAddr,
	getMainAddrList,
	getOtherAddrList,
	getSelfAddrList,
	fmtAddr
} from '../common/energyShield.js'

// ===== 开关状态 =====
const swState = reactive({
	zhayi: false,
	rwgp: false,
	wxdj: false,
	wxyh: false,
	wxmf: false,
	nld: false
})

// ===== 能量盾面板状态 =====
const shieldVisible = ref(false)
const shieldReady = ref(false)
const initLoading = ref(false)
const states = reactive({
	main: new Array(8).fill(false),
	other: new Array(8).fill(false),
	self: new Array(8).fill(false)
})
const shieldTab = ref('one')   // ★ 'one' | 'dev'


const baseAddr = ref(null)
const mainAddrList = ref(new Array(8).fill(null))
const otherAddrList = ref(new Array(8).fill(null))
const selfAddrList = ref(new Array(8).fill(null))

// ★ 刷新地址 + 状态
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
// ★ 复制地址
function copyAddr(addr) {
	if (!addr || addr <= 0) {
		uni.showToast({ icon: 'none', title: '地址无效', duration: 800 })
		return
	}
	const str = '0x' + Number(addr).toString(16)
	uni.setClipboardData({
		data: str,
		success: () => {
			uni.showToast({ icon: 'success', title: '已复制 ' + str, duration: 800 })
		}
	})
}

function closeShieldPanel() {
	shieldVisible.value = false
}

async function initShield() {
	if (initLoading.value) return
	initLoading.value = true
	try {
		await new Promise(r => setTimeout(r, 30))
		const ok = initEnergyShield()
		shieldReady.value = ok
		refreshStates()   // ★ 已包含地址刷新
		uni.showToast({
			icon: ok ? 'success' : 'none',
			title: ok ? '初始化成功' : '初始化失败',
			duration: 1200
		})
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
	if (ok) {
		refreshStates()
	} else {
		uni.showToast({ icon: 'none', title: '操作失败', duration: 1000 })
	}
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

// ===== 其他功能 =====
async function xgjr() {
	const input = prompt('请输入光翼数量(I32)：', '0')
	if (input === null || input === '') return
	const ok = await setWingCount(input)
	uni.showToast({
		icon: ok ? 'success' : 'none',
		title: ok ? '光翼设置成功' : '光翼设置失败',
		duration: 1200
	})
}

async function inputGoldF32() {
	const input = prompt('请输入高度(F32)：', '0')
	if (input === null || input === '') return
	const ok = await setGoldF32(input)
	uni.showToast({
		icon: ok ? 'success' : 'none',
		title: ok ? '高度设置成功' : '高度设置失败',
		duration: 1200
	})
}

async function zhayi(e) {
	const checked = e.detail.value
	swState.zhayi = checked
	if (!checked) return
	const input = prompt('炸翼，请输入要写入的I32数值：', '0')
	if (input === null || input === '') {
		swState.zhayi = false
		return
	}
	const ok = await setWingBurst(input)
	if (!ok) {
		swState.zhayi = false
		uni.showToast({ icon: 'none', title: '炸翼写入失败', duration: 1500 })
	} else {
		uni.showToast({ icon: 'success', title: '炸翼写入成功', duration: 1200 })
	}
}

function wxdj(e) {
	swState.wxdj = e.detail.value
}

function wxyh(e) {
	const checked = e.detail.value
	swState.wxyh = checked
	fireworkLoop(checked)
}

onUnmounted(() => {
	stopFireworkLoop()
	stopAllEnergyShield()
})
</script>

<style scoped>
/* ============ 能量盾弹窗 ============ */
.shield-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.shield-panel {
	width: 80vw;
	max-width: 900px;
	max-height: 88vh;
	background: rgba(240, 240, 240, 0.98);
	border-radius: 10px;
	box-shadow: 0 4px 18px rgba(0, 0, 0, 0.6);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.shield-header {
	height: 38px;
	background: rgba(209, 209, 209, 0.7);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 12px;
}

.shield-title {
	font-size: 15px;
	font-weight: 700;
	color: #000;
}

.shield-close {
	font-size: 18px;
	color: #333;
	cursor: pointer;
	padding: 4px 8px;
}

/* 状态栏 */
.shield-status {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 4px 6px;
	background: rgba(255, 255, 255, 0.6);
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.status-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}

.status-dot.online {
	background: #34c759;
	box-shadow: 0 0 8px rgba(52, 199, 89, 0.8);
}

.status-dot.offline {
	background: #ff3b30;
	box-shadow: 0 0 8px rgba(255, 59, 48, 0.8);
}

.status-text {
	font-size: 13px;
	font-weight: 600;
	color: #333;
	flex: 1;
}

.status-btn {
	border: none;
	border-radius: 6px;
	background: #409EFF;
	color: #fff;
	font-size: 12px;
	font-weight: 600;
}

.status-btn.loading {
	background: #ff9500;
}

.status-btn.done {
	background: #34c759;
}

/* 快捷操作 */
.shield-quick {
	display: flex;
	gap: 8px;
	padding: 4px 6px;
	flex-wrap: wrap;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.quick-btn {
	padding: 4px 10px;
	border: none;
	border-radius: 6px;
	background: #B1CEF0;
	color: #1e2a2e;
	font-size: 11px;
	font-weight: 600;
}

.quick-btn.danger {
	background: #ffb3b3;
}

/* 4×2 网格 */
.player-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	grid-template-rows: repeat(2, 1fr);
	gap: 8px;
	padding: 8px 10px;
	overflow-y: auto;
	flex: 1;
}

.player-card {
	background: rgba(255, 255, 255, 0.75);
	border: 1px solid rgba(0, 0, 0, 0.08);
	border-radius: 8px;
	padding: 6px 8px;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.player-card.self {
	border-color: rgba(52, 199, 89, 0.6);
	background: rgba(52, 199, 89, 0.08);
}

.player-title {
	font-size: 12px;
	font-weight: 700;
	color: #409EFF;
	text-align: center;
	padding-bottom: 3px;
	margin-bottom: 2px;
	border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

.player-card.self .player-title {
	color: #34c759;
}

.btn-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 4px;
}

.btn-label {
	font-size: 10px;
	color: #333;
	font-weight: 500;
	flex-shrink: 0;
}

.toggle-btn {
	padding: 2px 8px;
	border: none;
	border-radius: 5px;
	font-size: 10px;
	font-weight: 700;
	min-width: 34px;
	background: #ccc;
	color: #666;
}

.toggle-btn.on {
	background: #34c759;
	color: #fff;
}

.toggle-btn.off {
	background: #d0d0d0;
	color: #666;
}

.toggle-btn:disabled {
	background: #eee;
	color: #bbb;
}

.sky-task-block {
	display: flex;
	flex-direction: row;
	align-items: center;
	min-height: 42px;
}

.slider-wrap {
	display: flex;
	align-items: center;
	width: 100%;
	flex: 3;
}

.speed-slider {
	flex: 1;
	margin: 0;
}

.speed-label {
	min-width: 48px;
	text-align: right;
	color: #1e2a2e;
	font-size: 12px;
	font-weight: 600;
	font-family: monospace;
}

/* ===== Tab ===== */
.shield-tabs {
	display: flex;
	background: rgba(255, 255, 255, 0.5);
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	padding: 6px 0;
	gap: 4px;
}

.shield-tab {
	padding: 6px 14px;
	font-size: 12px;
	font-weight: 600;
	color: #666;
	cursor: pointer;
	border-radius: 6px 6px 0 0;
	background: rgba(189, 199, 208, 0.6);
	transition: background 0.15s;
}

.shield-tab.active {
	background: #B1CEF0;
	color: #1e2a2e;
}

/* ===== 弹窗主体容器 ===== */
.shield-body {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	flex: 1;
	min-height: 0;
}

/* ===== 开发者页 ===== */
.dev-body {
	padding: 8px 10px;
	overflow-y: auto;
}

.dev-row {
	display: flex;
	align-items: center;
	padding: 5px 0;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dev-row:last-child {
	border-bottom: none;
}

.dev-label {
	width: 110px;
	flex-shrink: 0;
	font-size: 11px;
	font-weight: 600;
	color: #333;
}

.dev-value {
	flex: 1;
	font-size: 10px;
	color: #409EFF;
	font-family: monospace;
	word-break: break-all;
	margin-right: 6px;
}

.mini-copy {
	padding: 3px 8px;
	border: none;
	border-radius: 6px;
	background: #8e8e93;
	color: #fff;
	font-size: 10px;
	font-weight: 600;
	flex-shrink: 0;
}

.mini-copy:active {
	background: #636366;
}
</style>