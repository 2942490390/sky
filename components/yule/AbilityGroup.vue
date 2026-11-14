<template>
	<view id="subGroupView">
		<!-- 神龛解锁 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-place-of-worship"></text>
				<text>神龛解锁</text>
			</view>
			<button class="sky-btn" @click="onShrine">执行</button>
		</view>

		<!-- 全动作发包 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-person-dots-from-line"></text>
				<text>全动作发包</text>
			</view>
			<button class="sky-btn" @click="onAllActions">执行</button>
		</view>

		<!-- 停止发包 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-circle-stop"></text>
				<text>停止发包任务</text>
			</view>
			<button class="sky-btn" @click="onStopBatch">停止</button>
		</view>
		<!-- 无限烟花 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-wand-magic-sparkles"></text>
				<text>无限烟花</text>
			</view>
			<switch :checked="swState.wxyh" color="#FFD966" style="transform: scale(0.75)" @change="wxyh" />
		</view>

		<!-- 燃烧弹 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-fire"></text>
				<text>燃烧弹</text>
			</view>
			<switch :checked="swState.ignite" color="#FFD966" style="transform: scale(0.75)" @change="onIgnite" />
		</view>

		<!-- 无视冥龙 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-dragon"></text>
				<text>无视冥龙</text>
			</view>
			<switch :checked="swState.krill" color="#FFD966" style="transform: scale(0.75)" @change="onKrill" />
		</view>
	</view>
</template>

<script setup>
import {onUnmounted, reactive} from 'vue'
import {fireworkV2, igniteLoop, ignoreKrillLoop, stopIgniteLoop, stopIgnoreKrillLoop} from '@/common/entertainment.js'
import {startAllActions, startShrineUnlock, stopPacketBatch} from '@/common/packetSender.js'

const swState = reactive({ wxyh: false, ignite: false, krill: false })

function wxyh(e) { swState.wxyh = e.detail.value; fireworkV2(e.detail.value) }
function onIgnite(e) { swState.ignite = e.detail.value; igniteLoop(e.detail.value) }
function onKrill(e) { swState.krill = e.detail.value; ignoreKrillLoop(e.detail.value) }

function onShrine() {
	const res = startShrineUnlock()
	uni.showToast({ icon: 'none', title: res ? '神龛任务已启动' : '神龛任务启动失败', duration: 800 })
}
function onAllActions() {
	const res = startAllActions()
	uni.showToast({ icon: 'none', title: res ? '全动作任务已启动' : '全动作任务启动失败', duration: 800 })
}
function onStopBatch() { stopPacketBatch() }

onUnmounted(() => {
	stopIgniteLoop()
	stopIgnoreKrillLoop()
	stopPacketBatch()
})
</script>

<style scoped>
@import './base.css';
</style>