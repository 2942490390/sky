<template>
	<view class="page">

		<!-- 人物坐标 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-ruler"></text>
				<text>人物坐标</text>
			</view>
			<button class="sky-btn" @tap="editAxis('x')">X：{{ coord.x.toFixed(3) }}</button>
			<button class="sky-btn axis" @tap="editAxis('z')">Z：{{ coord.z.toFixed(3) }}</button>
			<button class="sky-btn axis" @tap="editAxis('y')">Y：{{ coord.y.toFixed(3) }}</button>
		</view>

		<!-- 自动跑图 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-route"></text>
				<text>自动跑图</text>
			</view>
			<button class="sky-btn" @tap="toggleAutoRun">{{ autoRunLabel }}</button>
			<button class="sky-btn stop" @tap="stopAutoRun">停止跑图</button>
		</view>

		<!-- 无限能量 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-bolt"></text>
				<text>无限能量</text>
			</view>
			<switch :checked="swState.wxnl" color="#FFD966" style="transform: scale(0.75);" @change="wxnl" />
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

		<!-- 全局加速 -->
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
	</view>
</template>

<script setup>
	import {
		reactive,
		ref,
		onMounted,
		onUnmounted
	} from 'vue'
	import {
		energyLoop,
		stopEnergyLoop,
		speedLoop,
		stopSpeedLoop,
		burnLoop,
		bloomLoop,
		stopBurnLoop,
		stopBloomLoop,
		setCandleVisibility,
		clearCandleAddr
	} from '../common/h5gg.js'
	import {
		readCoordOnce,
		startCoordLoop,
		stopCoordLoop,
		setCoordAxis,
		startAutoRun,
		stopAutoRun as stopAutoRunFn,
		resetAutoRunIndex,
		isAutoRunRunning,
		getAutoRunPointsCount
	} from '../common/coordRunner.js'

	// ===== 开关状态 =====
	const swState = reactive({
		wxnl: false,
		burn: false,
		bloom: false,
		yclz: false
	})

	// ===== 坐标 =====
	const coord = reactive({
		x: 0,
		z: 0,
		y: 0
	})

	// ===== 自动跑图 UI 状态 =====
	const autoRunLabel = ref('开始跑图')
	const autoRunInterval = 3.8

	// ===== 全局加速 =====
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

	// ===== 无限能量 =====
	function wxnl(e) {
		const checked = e.detail.value
		swState.wxnl = checked
		energyLoop(checked)
	}

	// ===== 自燃全开 =====
	function onBurnChange(e) {
		const checked = e.detail.value
		swState.burn = checked
		burnLoop(checked)
	}

	// ===== 自动炸花 =====
	function onBloomChange(e) {
		const checked = e.detail.value
		swState.bloom = checked
		bloomLoop(checked)
	}

	// ===== 隐藏蜡烛 =====
	async function yclz(e) {
		try {
			const checked = e.detail.value
			swState.yclz = checked
			await setCandleVisibility(!checked)
		} catch (err) {
			console.error('[yclz] 出错:', err)
			swState.yclz = false
		}
	}

	// ===== 点击 X / Y / Z 编辑 =====
	async function editAxis(axis) {
		const current = coord[axis]
		const input = prompt(
			`修改 ${axis.toUpperCase()} 坐标（当前 ${current.toFixed(3)}）：`,
			String(current)
		)
		if (input === null) return
		const v = parseFloat(input)
		if (!Number.isFinite(v)) {
			uni.showToast({
				icon: 'none',
				title: '请输入有效数字'
			})
			return
		}
		const ok = await setCoordAxis(axis, v)
		uni.showToast({
			icon: ok ? 'success' : 'none',
			title: ok ? `${axis.toUpperCase()} 修改成功` : '修改失败'
		})
	}

	// ===== 自动跑图 =====
	async function toggleAutoRun() {
		if (isAutoRunRunning()) {
			// 暂停
			stopAutoRunFn()
			autoRunLabel.value = '继续跑图'
			return
		}

		// 询问间隔
		const input = prompt(
			'输入间隔秒数\n太快拉回建议 3.8 秒\n晨岛开始',
			String(autoRunInterval)
		)
		if (input === null) return
		const t = parseFloat(input)
		const interval = (!isNaN(t) && t > 0) ? t : 3.8

		autoRunLabel.value = '暂停跑图'
		await startAutoRun({
			intervalSec: interval,
			reset: false,
			onStep: (idx, total) => {
				console.log(`[自动跑图] ${idx + 1}/${total}`)
			},
			onFinish: () => {
				autoRunLabel.value = '开始跑图'
				uni.showToast({
					icon: 'none',
					title: '跑图完成'
				})
			}
		})
	}

	function stopAutoRun() {
		stopAutoRunFn()
		resetAutoRunIndex()
		autoRunLabel.value = '开始跑图'
		uni.showToast({
			icon: 'none',
			title: '已停止'
		})
	}

	// ===== 生命周期 =====
	onMounted(() => {
		// 轮询坐标（500ms）
		startCoordLoop((c) => {
			coord.x = c.x
			coord.z = c.z
			coord.y = c.y
		}, 500)
	})

	onUnmounted(() => {
		stopCoordLoop()
		stopAutoRunFn()
		stopEnergyLoop()
		stopSpeedLoop()
		stopBurnLoop()
		stopBloomLoop()
		clearCandleAddr()
	})
</script>

<style scoped>
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
</style>