<template>
	<view class="page">
		<view v-show="!showSubMapFlag" class="map-list">
			<view v-for="(map, key) in mapList" :key="key" class="sky-task">
				<view class="task-left">
					<text :class="map.icon"></text>
					<text>{{ map.name }}</text>
				</view>
				<button class="sky-btn-toggle" @click="showSubMap(key)">切换</button>
			</view>
		</view>

		<view v-show="showSubMapFlag" id="mainMapView">
			<view class="sky-task">
				<view class="task-left">
					<text class="fa-solid fa-arrow-left"></text>
					<text>返回地图列表</text>
				</view>
				<button class="sky-btn sky-btn-back" @click="backToMainMap">返回</button>
			</view>

			<view v-if="warpStatus.text" class="warp-status" :class="warpStatus.type">
				<text>{{ warpStatus.text }}</text>
			</view>

			<view v-if="currentSubMap" id="subMapView">
				<view class="sky-task" style="margin-bottom:6px">
					<view class="task-left">
						<text class="fa-solid fa-location-dot"></text>
						<text>{{ currentSubMap.name }} · 可传送点</text>
					</view>
				</view>
				<view v-for="(spot, idx) in currentSubMap.spots" :key="idx" class="submap-item">
					<view class="submap-left">
						<text class="fa-regular fa-circle-dot"></text>
						<text>{{ spot.name }}</text>
						<text class="warp-badge" :class="spot.anyDoorCode ? 'badge-anydoor' : 'badge-road'">
							{{ spot.anyDoorCode ? '任意门' : '不支持' }}
						</text>
					</view>
					<button class="sky-btn" style="padding:4px 14px" :disabled="isWarping(spot) || !spot.anyDoorCode"
						@click="warp(spot)">
						{{ isWarping(spot) ? '传送中…' : (spot.anyDoorCode ? '传送' : '不可用') }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import {
	initAnyDoor,
	goMapAnyDoor,
	readCurrentAnyDoorCode,
	clearAnyDoorCache
} from '@/common/features/warp.js'
import { subMapData } from '@/common/map/warpSpots.js'

const showSubMapFlag = ref(false)
const currentSubMap = ref(null)
const warpingKey = ref('')
const anyDoorReady = ref(false)

const warpStatus = reactive({ text: '', type: '' })

const mapList = {
	yujing: { name: '遇境', icon: 'fa-solid fa-home' },
	chendao: { name: '晨岛', icon: 'fa-regular fa-sun' },
	yunye: { name: '云野', icon: 'fa-solid fa-cloud' },
	yulin: { name: '雨林', icon: 'fa-solid fa-droplet' },
	xiagu: { name: '霞谷', icon: 'fa-regular fa-snowflake' },
	mutu: { name: '墓土', icon: 'fa-solid fa-mountain' },
	jinge: { name: '禁阁', icon: 'fa-solid fa-tower-broadcast' },
	yidian: { name: '伊甸', icon: 'fa-solid fa-fire' }
}

function showSubMap(mapKey) {
	const data = subMapData[mapKey]
	if (!data) return
	currentSubMap.value = data
	showSubMapFlag.value = true
	warpStatus.text = ''
	ensureAnyDoor()
}

function backToMainMap() {
	showSubMapFlag.value = false
	currentSubMap.value = null
	warpStatus.text = ''
}

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
			uni.showToast({ icon: 'none', title: '✅ 任意门传送成功' })
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

// 严格验证：只有读到目标 code 才返回 true
async function waitAnyDoorVerify(targetCode, timeoutMs = 6000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		await new Promise(r => setTimeout(r, 300))
		const cur = readCurrentAnyDoorCode()
		// 读到目标关卡名 = 成功
		if (cur === targetCode) return true
		// 读到别的合法关卡名，说明切到别处了 = 失败
		if (cur && /^[A-Za-z0-9_]{2,23}$/.test(cur) && cur !== targetCode) {
			console.warn('[任意门] 切到了非目标关卡:', cur, '目标:', targetCode)
			return false
		}
		// 空或中间态，继续等
	}
	return false
}

function clearAnyDoor() {
	clearAnyDoorCache()
	anyDoorReady.value = false
}
</script>

<style scoped>
.warp-status {
	margin: 8px 12px;
	padding: 8px 12px;
	border-radius: 6px;
	font-size: 13px;
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

.warp-badge {
	margin-left: 8px;
	padding: 1px 6px;
	border-radius: 4px;
	font-size: 11px;
}

.badge-anydoor {
	background: #eef3ff;
	color: #3355cc;
}

.badge-road {
	background: #f3f3f3;
	color: #888;
}
</style>