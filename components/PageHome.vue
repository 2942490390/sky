<template>
	<view class="page">
		<!-- ★ 轮播容器 -->
		<view class="carousel">
			<image class="carousel-img" src="/static/banner1_664d82c1.png" mode="aspectFit" />
			<image class="carousel-img" src="/static/lb2_e91841cd.png" mode="aspectFit" />
			<image class="carousel-img" src="/static/lb3_4f5edaf6.png" mode="aspectFit" />
			<image class="carousel-img" src="/static/lb4_577ed5e7.png" mode="aspectFit" />
			<image class="carousel-img" src="/static/lb5_d93f0206.png" mode="aspectFit" />
		</view>

		<view class="set-row">
			<!-- 任务进度 -->
			<view class="set-card">
				<text class="fa-solid fa-chart-line"></text>
				<text>任务进度</text>
				<slider class="progress-slider" :value="progressPercent" :disabled="true" min="0" max="100"
					activeColor="#FFD966" block-size="0" />
				<text class="progress-text">{{ progressText }}</text>
			</view>
			<!-- 面板缩放 -->
			<view class="set-card">
				<text class="fa-solid fa-expand"></text>
				<text>面板缩放</text>
				<slider class="scale-slider" :value="scaleSliderValue" min="60" max="100" activeColor="#FFD966"
					block-size="14" @changing="onScaleChange" @change="onScaleChange" />
				<text class="scale-num">{{ scaleSliderValue }}%</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import {
		computed
	} from 'vue'

	const props = defineProps({
		progressTotal: {
			type: Number,
			default: 0
		},
		progressCurrent: {
			type: Number,
			default: 0
		},
		currentMapName: {
			type: String,
			default: ''
		},
		scaleSliderValue: {
			type: Number,
			default: 100
		}
	})

	const emit = defineEmits(['update-scale'])

	const progressPercent = computed(() => {
		if (props.progressTotal === 0) return 0
		return Math.min(100, Math.floor((props.progressCurrent / props.progressTotal) * 100))
	})
	const progressText = computed(() => {
		if (props.progressTotal === 0) return '等待开始'
		const left = props.progressTotal - props.progressCurrent
		return `${props.currentMapName} ${left}个`
	})

	const onScaleChange = (e) => {
		emit('update-scale', e.detail.value)
	}
</script>

<style scoped>
	/* ================== 轮播容器 ================== */
	.carousel {
		position: relative;
		width: 100%;
		height: 50%;
		min-height: 120px;
		overflow: hidden;
		isolation: isolate;
	}

	/* 每张图绝对定位叠在一起 */
	.carousel-img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		animation: carouselFade 30s infinite;
		transform: translateZ(0);
		/* ★ 强制 GPU 合成层 */
		will-change: opacity;
		/* ★ 提升到独立层 */
		isolation: isolate;
	}

	/* 5 张图错开 6 秒 */
	.carousel-img:nth-child(1) {
		animation-delay: 0s;
	}

	.carousel-img:nth-child(2) {
		animation-delay: 6s;
	}

	.carousel-img:nth-child(3) {
		animation-delay: 12s;
	}

	.carousel-img:nth-child(4) {
		animation-delay: 18s;
	}

	.carousel-img:nth-child(5) {
		animation-delay: 24s;
	}

	/* 0~20% 显示（6 秒），其余透明 */
	@keyframes carouselFade {
		0% {
			opacity: 0;
		}

		2% {
			opacity: 1;
		}

		20% {
			opacity: 1;
		}

		22% {
			opacity: 0;
		}

		100% {
			opacity: 0;
		}
	}

	/* ================== 下方设置卡片 ================== */
	.set-row {
		width: 100%;
		height: calc(50% - 12px);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.set-card {
		flex: 1;
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(8px);
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.3);
		display: flex;
		align-items: center;
		padding: 0 14px;
		gap: 10px;
		color: white;
		font-size: 13px;
		transition: 0.2s;
	}

	.set-card:hover {
		background: rgba(255, 255, 255, 0.28);
	}

	.set-card text:first-child {
		font-size: 16px;
		width: 24px;
	}

	.set-card text:nth-child(2) {
		width: 70px;
		font-weight: 500;
	}

	.progress-slider,
	.scale-slider {
		flex: 1;
	}

	.progress-text {
		font-size: 12px;
		min-width: 70px;
	}

	.scale-num {
		font-size: 12px;
	}
</style>