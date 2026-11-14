<template>
	<view id="subGroupView">
		<!-- 场景亮度 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-person-running"></text>
				<text>场景亮度</text>
			</view>
			<view class="slider-wrap">
				<slider class="speed-slider" :value="brightnessValue" @changing="onBrightnessChanging"
					@change="onBrightnessChange" min="0.300537" max="400" step="0.1" activeColor="#FFD966"
					backgroundColor="rgba(0,0,0,0.15)" block-color="#FFF9E8" block-size="18" />
				<text class="speed-label">{{ brightnessValue.toFixed(2) }}</text>
			</view>
		</view>

		<!-- 设置高度 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>设置高度</text>
			</view>
			<button class="sky-btn" @click="inputGoldF32">执行</button>
		</view>

		<!-- 去风墙 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-wind"></text>
				<text>去风墙</text>
			</view>
			<switch :checked="swState.wall" color="#FFD966" style="transform: scale(0.75)" @change="onWall" />
		</view>

		<!-- 跳过动画 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-forward"></text>
				<text>跳过动画</text>
			</view>
			<switch :checked="swState.skipAnim" color="#FFD966" style="transform: scale(0.75)" @change="onSkipAnim" />
		</view>

		<!-- 全局离线 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-power-off"></text>
				<text>全局离线</text>
			</view>
			<switch :checked="swState.offline" color="#FFD966" style="transform: scale(0.75)" @change="onOffline" />
		</view>
	</view>
</template>

<script setup>
import {onUnmounted, reactive, ref} from 'vue'
import {setGoldF32} from '@/common/h5gg.js'
import {clearSceneBrightnessAddr, setSceneBrightness, stopSceneBrightnessLoop} from '@/common/scene.js'
import {globalOffline, setSkipAnim, stopGlobalOffline, stopWallLoop, wallLoop} from '@/common/entertainment.js'

const swState = reactive({ wall: false, skipAnim: false, offline: false })
const brightnessValue = ref(0.3)

function onBrightnessChanging(e) { brightnessValue.value = e.detail.value }
async function onBrightnessChange(e) {
	brightnessValue.value = e.detail.value
	await setSceneBrightness(brightnessValue.value)
}

async function inputGoldF32() {
	const input = prompt('请输入高度(F32)：', '0')
	if (input === null || input === '') return
	await setGoldF32(input)
}

function onWall(e) { swState.wall = e.detail.value; wallLoop(e.detail.value) }
function onSkipAnim(e) { swState.skipAnim = e.detail.value; setSkipAnim(e.detail.value) }
function onOffline(e) { swState.offline = e.detail.value; globalOffline(e.detail.value) }

onUnmounted(() => {
	stopSceneBrightnessLoop()
	clearSceneBrightnessAddr()
	stopWallLoop()
	stopGlobalOffline()
})
</script>

<style scoped>
@import './base.css';
</style>