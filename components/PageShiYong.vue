<template>
	<view class="page">
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-memory"></text>
				<text>内存吸火</text>
			</view>
			<button class="sky-btn" @click="xihuo()">执行</button>
		</view>

		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-arrow-rotate-left"></text>
				<text>回到遇境</text>
			</view>
			<button class="sky-btn" @click="warp('CandleSpace')">执行</button>
		</view>

		<!-- 无限能量 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-bolt"></text>
				<text>无限能量</text>
			</view>
			<switch :checked="swState.wxnl" color="#FFD966" style="transform: scale(0.75);" @change="wxnl" />
		</view>

		<!-- 全局加速（改为滑动条） -->
		<view class="sky-task sky-task-block">
			<view class="task-left">
				<text class="fa-solid fa-gauge-high"></text>
				<text>全局加速</text>
			</view>
			<view class="slider-wrap">
				<slider class="speed-slider" :value="speedValue" @changing="onSpeedChanging" @change="onSpeedChange"
					min="1" max="10" step="0.1" activeColor="#FFD966" backgroundColor="rgba(0,0,0,0.15)"
					block-color="#FFF9E8" block-size="18" />
				<text class="speed-label">{{ speedValue.toFixed(1) }}x</text>
			</view>
		</view>


		<!-- 自燃全开 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-fire"></text>
				<text>自燃全开</text>
			</view>
			<switch :checked="swState.burn" color="#FFD966" style="transform: scale(0.75);" @change="onBurnChange" />
		</view>

		<!-- 自动炸花 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-fire-flame-curved"></text>
				<text>自动炸花</text>
			</view>
			<switch :checked="swState.bloom" color="#FFD966" style="transform: scale(0.75);" @change="onBloomChange" />
		</view>


		<!-- 隐藏蜡烛 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-eye-slash"></text>
				<text>隐藏蜡烛</text>
			</view>
			<switch :checked="swState.yclz" color="#FFD966" style="transform: scale(0.75);" @change="yclz" />
		</view>

		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-ruler"></text>
				<text>我的身高</text>
			</view>
			<button class="sky-btn" @click="wdsg()">查询</button>
		</view>
	</view>
</template>

<script setup>
	import {
		reactive,
		ref,
		onUnmounted
	} from 'vue'
	import {
		energyLoop,
		stopEnergyLoop,
		speedLoop,
		setSpeed,
		stopSpeedLoop,
		burnLoop,
		bloomLoop,
		stopBurnLoop,
		stopBloomLoop,
		setCandleVisibility,
		clearCandleAddr
	} from '../common/h5gg.js'

	// ===== 开关状态 =====
	const swState = reactive({
		wxnl: false, // 无限能量
		burn: false, // ★ 补：自燃全开
		bloom: false, // ★ 补：自动炸花
		fzjb: false, // ★ 补：防止举报
		yclz: false // 隐藏蜡烛
	})


	// ===== 非响应式运行时状态 =====
	let nl = null
	let qj = false
	let zrzhId = null

	// ===== 原样保留的方法 =====

	function xihuo() {
		h5gg.clearResults();
		h5gg.searchNumber('3.5', 'F32', '0x110000000', '0x2000000000');
		h5gg.searchNearby('-1', 'F32', '0x60');
		h5gg.searchNumber('3.5', 'F32', '0x00000000', '0x2000000000');
		h5gg.editAll('1000000000', 'F32');
		alert("已吸取火蜡");
	}

	function warp(id) {
		if (typeof window !== 'undefined' && typeof window.warp === 'function') {
			window.warp(id);
		} else {
			console.log('warp:', id);
		}
	}
	// 无限能量
	function wxnl(e) {
		const checked = e.detail.value
		swState.wxnl = checked
		energyLoop(checked)
	}

	// 全局加速滑动条（保持不变）
	const speedValue = ref(1.0)

	function onSpeedChanging(e) {
		speedValue.value = e.detail.value
	}

	function onSpeedChange(e) {
		speedValue.value = e.detail.value
		const v = parseFloat(speedValue.value)
		if (v > 1) speedLoop(true, v)
		else speedLoop(false)
	}

	// ★ 自燃全开
	function onBurnChange(e) {
		const checked = e.detail.value
		swState.burn = checked
		console.log('自燃全开:', checked)
		burnLoop(checked)
	}

	// ★ 自动炸花
	function onBloomChange(e) {
		const checked = e.detail.value
		swState.bloom = checked
		console.log('自动炸花:', checked)
		bloomLoop(checked)
	}


	// 隐藏蜡烛
	async function yclz(e) {
		try {
			const checked = e.detail.value
			swState.yclz = checked
			console.log('隐藏蜡烛:', checked)
			// checked = true 表示"隐藏"，visible = !checked
			await setCandleVisibility(!checked)
		} catch (err) {
			console.error('[yclz] 出错:', err)
			// 报错时把开关重置
			swState.yclz = false
		}
	}

	function wdsg() {
		console.log('wdsg')
	}

	// ★ 页面卸载时清理所有循环，避免内存泄漏
	onUnmounted(() => {
		stopEnergyLoop()
		stopSpeedLoop()
		stopBurnLoop()
		stopBloomLoop()
		clearCandleAddr()
	})
</script>

<style scoped>
	/* 公共样式在 App.vue 全局，这里只保留滑动条专属样式 */

	/* 滑动条所在行改成上下布局，防止挤压 */
	.sky-task-block {
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
	}

	/* 滑块容器：横向排列「滑块 + 数值」 */
	.slider-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
	}

	/* 滑块本体，自适应剩余宽度 */
	.speed-slider {
		flex: 1;
		margin: 0;
	}

	/* 数值显示 */
	.speed-label {
		min-width: 48px;
		text-align: right;
		color: #1e2a2e;
		font-size: 12px;
		font-weight: 600;
		font-family: monospace;
	}
</style>