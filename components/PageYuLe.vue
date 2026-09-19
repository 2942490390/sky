<template>
	<view class="page">
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>修改光翼</text>
			</view>
			<button class="sky-btn" @click="xgjr()">执行</button>
		</view>

		<!-- 高危炸翼 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-skull"></text>
				<text>高危炸翼</text>
			</view>
			<switch :checked="swState.zhayi" color="#FFD966" style="transform: scale(0.75);" @change="zhayi" />
		</view>

		<!-- 人物狗爬 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-dog"></text>
				<text>人物狗爬</text>
			</view>
			<switch :checked="swState.rwgp" color="#FFD966" style="transform: scale(0.75);" @change="rwgp" />
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
	</view>
</template>

<script setup>
	import {
		reactive,
		onUnmounted
	} from 'vue'
	import {
		fireworkLoop,
		stopFireworkLoop
	} from '../common/h5gg.js'

	// ===== 开关状态 =====
	const swState = reactive({
		zhayi: false,
		rwgp: false,
		wxdj: false,
		wxyh: false
	})

	// ===== 非响应式运行时状态 =====
	let lq = null // 无限道具定时器

	// ===== 原样保留的方法 =====

	function xgjr() {
		var num = prompt('请输入小金人数量');
		h5gg.setValue(gysl, num, 'I32');
	}

	// 高危炸翼
	function zhayi(e) {
		const checked = e.detail.value
		swState.zhayi = checked
		console.log('高危炸翼:', checked)

		if (checked) {
			var num = prompt('请输入炸多少翼');
			if (num !== null && num !== '') {
				h5gg.setValue(zy, num, 'I32');
			} else {
				// 用户取消输入，把开关自动关掉
				swState.zhayi = false
			}
		}
	}

	// 人物狗爬
	function rwgp(e) {
		const checked = e.detail.value
		swState.rwgp = checked
		console.log('人物狗爬:', checked)
	}

	// 无限道具
	function wxdj(e) {
		const checked = e.detail.value
		swState.wxdj = checked
		console.log('无限道具:', checked)

		if (checked) {
			lq = setInterval(() => {
				h5gg.setValue(daoju, 0, "F32");
				h5gg.setValue(lengqu, 16843008, "I32");
			}, 0);
		} else {
			if (lq) {
				clearInterval(lq);
				lq = null;
			}
		}
	}

	function wxyh(e) {
		const checked = e.detail.value
		swState.wxyh = checked
		fireworkLoop(checked) // ★ 新增
	}


	onUnmounted(() => {
		stopFireworkLoop()
	})
</script>

<style scoped>
	/* 公共样式在 App.vue 全局，这里留空即可 */
</style>