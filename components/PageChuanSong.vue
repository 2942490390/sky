<template>
	<view class="page">
		<!-- 主地图列表 -->
		<view v-show="!showSubMapFlag" class="map-list">
			<view v-for="(map, key) in mapList" :key="key" class="sky-task">
				<view class="task-left">
					<text :class="map.icon"></text>
					<text>{{ map.name }}</text>
				</view>
				<button class="sky-btn-toggle" @click="showSubMap(key)">切换</button>
			</view>
		</view>

		<!-- 子地图列表 -->
		<view v-show="showSubMapFlag" id="mainMapView">
			<view class="sky-task">
				<view class="task-left">
					<text class="fa-solid fa-arrow-left"></text>
					<text>返回地图列表</text>
				</view>
				<button class="sky-btn sky-btn-back" @click="backToMainMap">返回</button>
			</view>

			<view v-if="currentSubMap" id="subMapView">
				<view class="sky-task" style="margin-bottom:6px;">
					<view class="task-left">
						<text class="fa-solid fa-location-dot"></text>
						<text>{{ currentSubMap.name }} · 可传送点</text>
					</view>
				</view>
				<view v-for="(spot, idx) in currentSubMap.spots" :key="idx" class="submap-item">
					<view class="submap-left">
						<text class="fa-regular fa-circle-dot"></text>
						<text>{{ spot.name }}</text>
					</view>
					<!-- ★ 传整个 spot -->
					<button class="sky-btn" style="padding:4px 14px;" @click="warp(spot)">
						传送
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { executeWarp } from '../common/h5gg.js'
import { subMapData } from '../common/warpSpots.js'   // ★ 从独立文件 import

// ★ 传整个 spot，中文名用于兜底反查
async function warp(spot) {
	if (!spot || !spot.warpId) return
	await executeWarp(spot.warpId, spot.name)
}

const showSubMapFlag = ref(false)
const currentSubMap = ref(null)

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
}

function backToMainMap() {
	showSubMapFlag.value = false
	currentSubMap.value = null
}
</script>

<style scoped>
.map-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
</style>