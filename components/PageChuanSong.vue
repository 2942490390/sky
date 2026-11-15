<template>
	<view class="page teleport-panel">
		<!-- ==================== 一级：传送环 ==================== -->
		<view v-if="!activeMap" class="panel-title">传送</view>

		<view v-if="!activeMap" class="teleport-ring">
			<!-- 波纹 -->
			<view class="ring-waves"><span></span><span></span><span></span></view>

			<!-- 四角装饰 -->
			<view class="corner corner-tl">
				<text class="fa-solid fa-feather"></text>
				<text>{{ MAP_COUNT }} 地图</text>
			</view>
			<view class="corner corner-tr">
				<text class="fa-solid fa-location-dot"></text>
				<text>{{ WARP_POINT_COUNT }} 传送点</text>
			</view>
			<view class="corner corner-bl">
				<text class="fa-solid fa-wind"></text>
				<text>按需传送</text>
			</view>
			<view class="corner corner-br">
				<text class="fa-solid fa-star"></text>
				<text>Sky</text>
			</view>

			<!-- 旋转轨道 -->
			<view class="ring-track"></view>

			<!-- 中心：遇境 -->
			<button class="ring-core" :style="ringCoreStyle" @click="openSub('yujing')">
				<text class="fa-solid fa-house"></text>
				<text>遇境</text>
			</button>

			<!-- 环绕节点 -->
			<button v-for="node in ringNodes" :key="node.key" class="ring-node" :style="node.style"
				@click="openSub(node.key)">
				<text :class="node.icon"></text>
				<text>{{ node.name }}</text>
			</button>
		</view>

		<!-- ==================== 二级：地点列表 ==================== -->
		<view v-if="activeMap" class="teleport-sub show">
			<view class="sub-header">
				<button class="sub-back" @click="closeSub">
					<text class="fa-solid fa-arrow-left"></text>
				</button>
				<text class="sub-title">{{ currentMapName }}</text>
			</view>

			<input v-model="subSearch" type="text" class="sub-search" placeholder="搜索地点..." />

			<!-- 传送状态条（保留原逻辑） -->
			<view v-if="warpStatus.text" class="warp-status" :class="warpStatus.type">
				<text>{{ warpStatus.text }}</text>
			</view>

			<view class="sub-list">
				<button v-for="(spot, idx) in filteredSpots" :key="idx" class="sub-btn"
					:disabled="isWarping(spot) || !spot.anyDoorCode" @click="warp(spot)">
					<text class="fa-solid fa-location-dot"></text>
					<text class="name">{{ spot.name }}</text>
					<text class="tp-chip" :class="{ done: isWarping(spot), disabled: !spot.anyDoorCode }">
						{{ isWarping(spot) ? '…' : (spot.anyDoorCode ? '传送' : '不支持') }}
					</text>
				</button>
			</view>

			<view v-if="filteredSpots.length === 0" class="sub-empty show">
				没有匹配的地点
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import {
	initAnyDoor,
	goMapAnyDoor,
	readCurrentAnyDoorCode,
	clearAnyDoorCache
} from '@/common/features/warp.js'
import { subMapData } from '@/common/map/warpSpots.js'

// ==================== 地图配置 ====================
// 中心：遇境；环绕：其余 7 张

const RING_NODES_META = [
	{ key: 'chendao', name: '晨岛', icon: 'fa-solid fa-mountain-sun', angle: 0 },
	{ key: 'yunye', name: '云野', icon: 'fa-solid fa-cloud', angle: 51.4 },
	{ key: 'yulin', name: '雨林', icon: 'fa-solid fa-tree', angle: 102.8 },
	{ key: 'xiagu', name: '霞谷', icon: 'fa-solid fa-archway', angle: 154.2 },
	{ key: 'mutu', name: '墓土', icon: 'fa-solid fa-skull', angle: 205.7 },
	{ key: 'jinge', name: '禁阁', icon: 'fa-solid fa-building-columns', angle: 257.1 },
	{ key: 'yidian', name: '伊甸', icon: 'fa-solid fa-volcano', angle: 308.5 }
]

// 地图张数：以 subMapData 的 key 为准（含中心遇境）
const MAP_COUNT = computed(() => Object.keys(subMapData).length)

// 可传送地点总数：只统计 anyDoorCode 非空的地点
const WARP_POINT_COUNT = computed(() => {
	let n = 0
	for (const key in subMapData) {
		const spots = subMapData[key]?.spots
		if (!Array.isArray(spots)) continue
		for (const s of spots) {
			if (s && s.anyDoorCode) n++
		}
	}
	return n
})

const RING_RADIUS = 106

// ==================== 状态 ====================
const activeMap = ref(null)
const subSearch = ref('')
const warpingKey = ref('')
const anyDoorReady = ref(false)

const warpStatus = reactive({ text: '', type: '' })

// ==================== 环形节点定位 ====================
const ringCoreStyle = {}

const ringNodes = computed(() => {
	return RING_NODES_META.map(node => {
		const rad = (node.angle - 90) * Math.PI / 180
		const x = Math.cos(rad) * RING_RADIUS
		const y = Math.sin(rad) * RING_RADIUS
		return {
			...node,
			style: {
				transform: `translate(${x}px, ${y}px)`,
				'--tx': `${x}px`,
				'--ty': `${y}px`
			}
		}
	})
})

// ==================== 当前地图 & 搜索过滤 ====================
const currentMapName = computed(() => {
	if (!activeMap.value) return ''
	const data = subMapData[activeMap.value]
	return data ? data.name : activeMap.value
})

const currentSpots = computed(() => {
	if (!activeMap.value) return []
	const data = subMapData[activeMap.value]
	return data && Array.isArray(data.spots) ? data.spots : []
})

const filteredSpots = computed(() => {
	const kw = subSearch.value.trim().toLowerCase()
	if (!kw) return currentSpots.value
	return currentSpots.value.filter(s =>
		String(s.name || '').toLowerCase().includes(kw)
	)
})

// ==================== 一级 / 二级切换 ====================
function openSub(mapKey) {
	if (!subMapData[mapKey]) {
		uni.showToast({ icon: 'none', title: '该地图暂无传送点' })
		return
	}
	activeMap.value = mapKey
	subSearch.value = ''
	warpStatus.text = ''
	ensureAnyDoor()
}

function closeSub() {
	activeMap.value = null
	subSearch.value = ''
	warpStatus.text = ''
}

// ==================== 任意门逻辑（原样保留） ====================
async function ensureAnyDoor() {
	if (anyDoorReady.value) return true
	try {
		anyDoorReady.value = await initAnyDoor()
	} catch (e) {
		anyDoorReady.value = false
	}
	if (!anyDoorReady.value) {
		setStatus('❌ 任意门初始化失败：当前地图暂未配置特征码', 'fail')
	}
	return anyDoorReady.value
}

function spotKey(spot) {
	return spot.anyDoorCode || spot.name
}

function isWarping(spot) {
	return warpingKey.value === spotKey(spot)
}

function setStatus(text, type = 'info') {
	warpStatus.text = text
	warpStatus.type = type
}

async function warp(spot) {
	if (!spot) return
	if (warpingKey.value) return

	if (!spot.anyDoorCode) {
		setStatus(`❌ 该点不支持任意门：${spot.name}`, 'fail')
		return
	}

	warpingKey.value = spotKey(spot)

	try {
		if (!await ensureAnyDoor()) {
			setStatus('❌ 任意门不可用（首次需在遇境初始化）', 'fail')
			uni.showToast({ icon: 'none', title: '请先回遇境初始化' })
			return
		}

		setStatus(`任意门传送 → ${spot.name} …`, 'info')
		const r = await goMapAnyDoor(spot.anyDoorCode)
		if (!r.success) {
			setStatus(`❌ 任意门写入失败：${r.reason}`, 'fail')
			uni.showToast({ icon: 'none', title: '传送失败' })
			return
		}

		if (r.writtenCode !== spot.anyDoorCode) {
			setStatus(`⚠️ 写入后读回="${r.writtenCode}"（可能游戏在处理），等待切图中…`, 'info')
		} else {
			setStatus(`已写入 ${spot.anyDoorCode}，等待游戏切图…`, 'info')
		}

		const verified = await waitAnyDoorVerify(spot.anyDoorCode, 6000)
		if (verified) {
			setStatus(`✅ 任意门传送成功：${spot.name}`, 'ok')
		} else {
			setStatus(`❌ 写入成功但游戏未切到目标关卡`, 'fail')
			uni.showToast({ icon: 'none', title: '未生效' })
		}
	} catch (e) {
		console.error('[warp] 异常:', e)
		setStatus(`❌ 传送异常：${e.message}`, 'fail')
		uni.showToast({ icon: 'none', title: '传送异常' })
	} finally {
		warpingKey.value = ''
	}
}

async function waitAnyDoorVerify(targetCode, timeoutMs = 6000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		await new Promise(r => setTimeout(r, 300))
		const cur = readCurrentAnyDoorCode()
		if (cur === targetCode) return true
		if (cur && /^[A-Za-z0-9_]{2,23}$/.test(cur) && cur !== targetCode) {
			console.warn('[任意门] 切到了非目标关卡:', cur, '目标:', targetCode)
			return false
		}
	}
	return false
}

function clearAnyDoor() {
	clearAnyDoorCache()
	anyDoorReady.value = false
}
</script>

<style scoped>
/* ===== 父容器：给 teleport-sub 提供定位上下文 ===== */
.teleport-panel {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	/* background: #fff; */
	overflow: hidden;
}

/* ===== 面板标题（对应 HTML 的 .panel-title） ===== */
.panel-title {
	font-size: 13px;
	font-weight: 700;
	text-transform: uppercase;
	color: #1e2a2e;
	margin-bottom: 2px;
	display: flex;
	align-items: center;
	gap: 8px;
	width: 100%;
	flex-shrink: 0;
}

.panel-title::after {
	content: '';
	flex: 1;
	height: 1px;
	background: #fff;
	border-radius: 1px;
}

/* ===== 传送环容器 ===== */
.teleport-ring {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 280px;
}

/* ===== 波纹 ===== */
.ring-waves {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 240px;
	height: 240px;
	pointer-events: none;
	z-index: 0;
}

.ring-waves span {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 100%;
	height: 100%;
	margin-left: -50%;
	margin-top: -50%;
	border-radius: 50%;
	border: 1.5px solid #dde4ee;
	opacity: 0;
	animation: wave-expand 4s ease-out infinite;
}

.ring-waves span:nth-child(1) {
	animation-delay: 0s;
}

.ring-waves span:nth-child(2) {
	animation-delay: 1.3s;
}

.ring-waves span:nth-child(3) {
	animation-delay: 2.6s;
}

@keyframes wave-expand {
	0% {
		transform: scale(.6);
		opacity: 0;
	}

	30% {
		opacity: .35;
	}

	100% {
		transform: scale(1.6);
		opacity: 0;
	}
}

/* ===== 四角装饰 ===== */
.corner {
	position: absolute;
	display: flex;
	align-items: center;
	gap: 4px;
	font-size: 12px;
	font-weight: 600;
	color: #cbd5e1;
	pointer-events: none;
	z-index: 1;
}

.corner text {
	font-size: 12px;
	color: #fff;
}

.corner-tl {
	top: 4px;
	left: 4px;
}

.corner-tr {
	top: 4px;
	right: 4px;
	flex-direction: row-reverse;
}

.corner-bl {
	bottom: 4px;
	left: 4px;
}

.corner-br {
	bottom: 4px;
	right: 4px;
	flex-direction: row-reverse;
}

/* ===== 旋转轨道 ===== */
.ring-track {
	position: absolute;
	width: 218px;
	height: 218px;
	border-radius: 50%;
	border: 1.5px dashed #dde4ee;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	animation: ring-rotate 40s linear infinite;
	z-index: 1;
}

@keyframes ring-rotate {
	to {
		transform: translate(-50%, -50%) rotate(360deg);
	}
}

/* ===== 中心按钮（遇境） ===== */
.ring-core {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 64px;
	height: 64px;
	border-radius: 50%;
	background: linear-gradient(145deg, #eaf2fd, #d4e2f5);
	border: 1.5px solid #8aa8cc;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	cursor: pointer;
	box-shadow: 0 5px 16px -5px rgba(74, 111, 165, .45),
		inset 0 1px 2px rgba(255, 255, 255, .9);
	z-index: 4;
	transition: all .2s cubic-bezier(.34, 1.56, .64, 1);
	line-height: 1;
	padding: 0;
}

.ring-core text:first-child {
	font-size: 20px;
	color: #4a6fa5;
}

.ring-core text:last-child {
	font-size: 9px;
	font-weight: 700;
	color: #2d4a75;
}

.ring-core:hover {
	background: linear-gradient(145deg, #dce9f8, #c2d6ee);
	transform: translate(-50%, -50%) scale(1.1);
}

.ring-core:active {
	transform: translate(-50%, -50%) scale(.95);
}

/* ===== 环绕节点 ===== */
.ring-node {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 50px;
	height: 50px;
	margin-left: -25px;
	margin-top: -25px;
	border-radius: 50%;
	border: 1px solid #dbe3ef;
	background: #fff;
	color: #475569;
	font-size: 9px;
	font-weight: 600;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1px;
	transition: all .2s cubic-bezier(.34, 1.56, .64, 1);
	box-shadow: 0 3px 8px -3px rgba(30, 41, 59, .12);
	z-index: 2;
	line-height: 1;
	padding: 0;
}

.ring-node text:first-child {
	font-size: 14px;
	color: #94a3b8;
}

.ring-node text:last-child {
	font-size: 9px;
}

.ring-node:hover {
	background: #eaf1fb;
	border-color: #8aa8cc;
	color: #2d4a75;
	box-shadow: 0 6px 16px -6px rgba(74, 111, 165, .4);
	z-index: 10;
}

.ring-node:hover text:first-child {
	color: #4a6fa5;
}

.ring-node:active {
	background: #d8e5f5;
}

/* 关键：hover / active 时保留 translate，叠加 scale */
.ring-node:hover {
	transform: translate(var(--tx), var(--ty)) scale(1.18) !important;
}

.ring-node:active {
	transform: translate(var(--tx), var(--ty)) scale(.95) !important;
}

/* ===== 二级子页面 ===== */
.teleport-sub {
	display: none;
	flex-direction: column;
	width: 100%;
	height: 100%;
	position: absolute;
	inset: 0;
	padding: 16px 14px;
	background: #fff;
	border-radius: 8px;
	z-index: 100;
	overflow: hidden;
}

.teleport-sub.show {
	display: flex;
	animation: slideIn .22s ease;
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateX(10px);
	}

	to {
		opacity: 1;
		transform: translateX(0);
	}
}

/* ===== 二级头部 ===== */
.sub-header {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
	flex-shrink: 0;
}

.sub-back {
	width: 24px;
	height: 24px;
	border-radius: 8px;
	border: 1px solid #e8edf4;
	background: #fff;
	color: #64748b;
	font-size: 11px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all .15s;
	flex-shrink: 0;
	padding: 0;
}

.sub-back:hover {
	background: #eaf1fb;
	color: #2d4a75;
	border-color: #b8c9e0;
}

.sub-back:active {
	transform: scale(.9);
}

.sub-title {
	font-size: 11px;
	font-weight: 700;
	color: #475569;
	flex: 1;
	text-align: left;
}

/* ===== 搜索框 ===== */
.sub-search {
	flex-shrink: 0;
	width: 100%;
	height: 26px;
	padding: 0 10px;
	border: 1px solid #e8edf4;
	border-radius: 8px;
	background: #f8fafd;
	color: #475569;
	font-size: 11px;
	outline: none;
	margin-bottom: 8px;
	transition: border-color .15s;
	font-family: inherit;
	box-sizing: border-box;
}

.sub-search:focus {
	border-color: #8aa8cc;
	background: #fff;
}

.sub-search::placeholder {
	color: #cbd5e1;
}

/* ===== 地点列表 ===== */
.sub-list {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	overflow-x: hidden;
	display: flex;
	flex-direction: column;
	gap: 5px;
	scrollbar-width: none;
	-ms-overflow-style: none;
	padding-right: 2px;
}

.sub-list::-webkit-scrollbar {
	width: 0;
	height: 0;
}

/* ===== 地点按钮 ===== */
.sub-btn {
	flex-shrink: 0;
	width: 100%;
	height: 32px;
	padding: 2px;
	border: 1px solid #e8edf4;
	border-radius: 16px;
	background: #fff;
	color: #334155;
	font-size: 11px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	transition: all .15s;
	white-space: nowrap;
	overflow: hidden;
	line-height: 1;
	text-align: left;
}

.sub-btn text:first-child {
	font-size: 11px;
	color: #64748b;
	flex-shrink: 0;
	transition: color .15s;
}

.sub-btn .name {
	flex: 1;
	text-align: left;
	overflow: hidden;
	text-overflow: ellipsis;
}

.sub-btn:hover {
	background: #f4f7fc;
	border-color: #d5deea;
}

.sub-btn:hover text:first-child {
	color: #334155;
}

.sub-btn:active {
	transform: scale(.98);
	background: #e8eef6;
}

.sub-btn[disabled] {
	opacity: .55;
	cursor: not-allowed;
}

/* ===== 传送胶囊 ===== */
.tp-chip {
	flex-shrink: 0;
	margin-left: auto;
	height: 24px;
	padding: 0 10px;
	border: 1px solid #b8c9e0;
	border-radius: 48px;
	background: #eaf1fb;
	color: #4a6fa5;
	font-size: 9px;
	font-weight: 600;
	line-height: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all .15s;
}

.tp-chip.done {
	background: #c2d6ee;
	border-color: #6b8cbd;
	color: #2d4a75;
}

.tp-chip.disabled {
	background: #f3f3f3;
	border-color: #ddd;
	color: #aaa;
}

/* ===== 空态 ===== */
.sub-empty {
	font-size: 10px;
	color: #cbd5e1;
	text-align: center;
	padding: 16px 0;
	font-style: italic;
	display: none;
}

.sub-empty.show {
	display: block;
}

/* ===== 状态条（原有逻辑，样式保留） ===== */
.warp-status {
	margin: 0 0 8px;
	padding: 8px 12px;
	border-radius: 6px;
	font-size: 12px;
	flex-shrink: 0;
}

.warp-status.info {
	background: #eef3ff;
	color: #3355cc;
}

.warp-status.ok {
	background: #e8f8ee;
	color: #1a8a44;
}

.warp-status.fail {
	background: #fdecec;
	color: #cc3333;
}
</style>