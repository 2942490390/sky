<template>
	<view class="container" :key="reloadKey">
		<view class="scale-wrap" :style="{ transform: `scale(${scaleValue})` }">
			<view class="animate-in">
				<view class="glass-panel">
					<!-- <view class="panel-title">Sky-iOS-Gold</view> -->
					<i @click="onReloadClick" class="fa-regular fa-circle-xmark reload-icon" :class="{ 'fa-spin': reloading }" />
					<NavBar :active-index="activeNav" @change="switchPage" />
					<view class="vertical-divider"></view>

					<view class="right-container">
						<!-- ★ 关键：Home 单独渲染，绑定 @update-scale -->
						<PageHome v-show="activeNav === 0" :progress-total="progressTotal"
							:progress-current="progressCurrent" :current-map-name="currentMapName"
							:scale-slider-value="scaleSliderValue" @update-scale="onScaleChange" />

						<!-- 其他页面用动态组件 -->
						<component v-for="(item, index) in otherPages" :key="item.key" :is="item.component"
							v-show="activeNav === index + 1" />
					</view>
				</view>
			</view>

		</view>
	</view>
</template>

<script setup>
	import {
		ref
	} from 'vue'
	import NavBar from '@/components/NavBar.vue'
	import PageHome from '@/components/PageHome.vue'
	import PageYuanDi from '@/components/PageYuanDi.vue'
	import PageShiYong from '@/components/PageShiYong.vue'
	import PageYuLe from '@/components/PageYuLe.vue'
	import PageChuanSong from '@/components/PageChuanSong.vue'
	import PageDaiRen from '@/components/PageDaiRen.vue'
	import PointerChainSearch from '@/components/PointerChainSearch.vue'
	import PageSettings from '@/components/PageSettings.vue'
	import {
		useReload
	} from '../../common/useReload.js'

	// Home 单独处理，其他页面用 v-for
	const otherPages = [{
			key: 'yuandi',
			component: PageYuanDi
		},
		{
			key: 'shiyong',
			component: PageShiYong
		},
		{
			key: 'yule',
			component: PageYuLe
		},
		{
			key: 'chuansong',
			component: PageChuanSong
		},
		{
			key: 'dairen',
			component: PageDaiRen
		},
		{
			key: 'pointer',
			component: PointerChainSearch
		},
		{
			key: 'settings',
			component: PageSettings
		}
	]

	const load = useReload()

	const reloadKey = load.reloadKey
	const reload = load.reload

	const activeNav = ref(0)

	// ★ 缩放状态提升到父组件
	const scaleSliderValue = ref(100) // 滑块显示值（60~140）
	const scaleValue = ref(1.0) // 面板缩放（0.6~1.4）

	// 进度状态
	const progressTotal = ref(0)
	const progressCurrent = ref(0)
	const currentMapName = ref('')

	const onScaleChange = (val) => {
		scaleSliderValue.value = val
		scaleValue.value = val / 100
	}

	const switchPage = (index) => {
		activeNav.value = index
	}

	const reloading = ref(false)

	function onReloadClick() {
		reloading.value = true
		reload(1000)
		// 1000ms 后停止旋转
		setTimeout(() => {
			reloading.value = false
		}, 1000)
	}
</script>

<style scoped>
	.reload-icon {
		position: absolute;
		z-index: 99999;
		top: 11px;
		right: 7px;
		color: #fff;
		display: inline-block;
		width: 20px;
		height: 20px;
		line-height: 20px;
		text-align: center;
		/* ★ 用 transform 统一控制旋转中心 */
		transform-origin: center center;
		will-change: transform;
	}

	/* 旋转状态 */
	.reload-icon.is-spinning {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}

		to {
			transform: rotate(360deg);
		}
	}
</style>