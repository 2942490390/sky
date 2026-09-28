<template>
	<view class="page">
		<!-- 人物狗爬 -->
		<!-- 		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-dog"></text>
				<text>人物狗爬</text>
			</view>
			<switch :checked="swState.rwgp" color="#FFD966" style="transform: scale(0.75);" @change="rwgp" />
		</view> -->
		<!-- 修改光翼 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>修改光翼</text>
			</view>
			<button class="sky-btn" @tap="xgjr">执行</button>
		</view>
		<!-- 设置高度 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>设置高度</text>
			</view>
			<button class="sky-btn" @tap="inputGoldF32">执行</button>
		</view>
		<!-- 能量盾 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-shield"></text>
				<text>能量护盾</text>
			</view>
			<switch :checked="swState.nld" color="#FFD966" style="transform: scale(0.75);" @change="nld" />
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
		<!-- 无限魔法 -->
		<!-- 		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-wand-magic-sparkles"></text>
				<text>无限魔法</text>
			</view>
			<switch :checked="swState.wxmf" color="#FFD966" style="transform: scale(0.75);" @change="wxmf" />
		</view> -->


		<!-- 高危炸翼 -->
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-skull"></text>
				<text>高危炸翼</text>
			</view>
			<switch :checked="swState.zhayi" color="#FFD966" style="transform: scale(0.75);" @change="zhayi" />
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
		stopFireworkLoop,
		energyShieldLoop,
		stopEnergyShieldLoop,
		setWingCount,
		setGoldF32,
		setWingBurst
	} from '../common/h5gg.js'

	// ===== 开关状态 =====
	const swState = reactive({
		zhayi: false,
		rwgp: false,
		wxdj: false,
		wxyh: false,
		wxmf: false,
		nld: false
	})

	// ===== 非响应式运行时状态 =====
	let lq = null // 无限道具定时器
	// ===== 修改光翼（点击执行） =====
	async function xgjr() {
		const input = prompt('请输入光翼数量(I32)：', '0')
		if (input === null || input === '') return
		const ok = await setWingCount(input)
		uni.showToast({
			icon: ok ? 'success' : 'none',
			title: ok ? '光翼设置成功' : '光翼设置失败',
			duration: 1200
		})
	}

	// ===== 设置高度（点击执行） =====
	async function inputGoldF32() {
		const input = prompt('请输入高度(F32)：', '0')
		if (input === null || input === '') return
		const ok = await setGoldF32(input)
		uni.showToast({
			icon: ok ? 'success' : 'none',
			title: ok ? '高度设置成功' : '高度设置失败',
			duration: 1200
		})
	}

	// ===== 高危炸翼（开关） =====
	async function zhayi(e) {
		const checked = e.detail.value
		swState.zhayi = checked

		if (!checked) return

		const input = prompt('炸翼，请输入要写入的I32数值：', '0')
		if (input === null || input === '') {
			swState.zhayi = false
			return
		}

		const ok = await setWingBurst(input)
		if (!ok) {
			swState.zhayi = false
			uni.showToast({
				icon: 'none',
				title: '炸翼写入失败',
				duration: 1500
			})
		} else {
			uni.showToast({
				icon: 'success',
				title: '炸翼写入成功',
				duration: 1200
			})
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

		// if (checked) {
		// 	lq = setInterval(() => {
		// 		h5gg.setValue(daoju, 0, "F32");
		// 		h5gg.setValue(lengqu, 16843008, "I32");
		// 	}, 0);
		// } else {
		// 	if (lq) {
		// 		clearInterval(lq);
		// 		lq = null;
		// 	}
		// }
	}

	function wxyh(e) {
		const checked = e.detail.value
		swState.wxyh = checked
		fireworkLoop(checked)
	}

	async function wxmf(e) {
		const checked = e.detail.value
		swState.wxmf = checked

		// h5gg.searchNumber('1097748727', 'I32', '0x130000000', '0x160000000');
		// h5gg.editAll('1', 'I32');
		// const count = h5gg.getResultsCount();
		// const raw = h5gg.getResults(count) || {};
		// for (let i = 0; i < raw.length; i++) {
		// 	const item = raw[i];
		// 	const address = Number(h5gg.getValue(item.address, 'I32'));
		// 	const nextAddr = addr + 16; // 往下偏移 0x10 -> 16
		// 	const nextAddrHex = '0x' + nextAddr.toString(16); // 无限时间
		// 	h5gg.setValue(nextAddrHex, -1, 'I32');

		// 	const nextAddr2 = addr + 24; // 往下偏移 0x18 -> 24
		// 	const nextAddrHex2 = '0x' + nextAddr2.toString(16); // 不限制开启时间
		// 	h5gg.setValue(nextAddrHex2, 0, 'I32');

		// 	const nextAddr3 = addr + 36; // 往下偏移 0x24 -> 36
		// 	const nextAddrHex3 = '0x' + nextAddr3.toString(16); // 魔法激活地址
		// 	h5gg.setValue(nextAddrHex3, 0, 'I32');
		// }
	}


	// ★ 能量盾开关（只调 h5gg）
	async function nld(e) {
		const checked = e.detail.value
		swState.nld = checked
		// console.log('[PageYuLe] 能量盾:', checked)

		const ok = await energyShieldLoop(checked)
		if (!ok) {
			// 初始化失败 → 回退开关
			swState.nld = false
			uni.showToast({
				title: '能量盾初始化失败',
				icon: 'none'
			})
			return
		}

		uni.showToast({
			title: checked ? '能量盾已开启' : '能量盾已关闭',
			icon: checked ? 'success' : 'none',
			duration: 1000
		})
	}
	onUnmounted(() => {
		stopFireworkLoop()
		stopEnergyShieldLoop()
	})
</script>

<style scoped>
	/* 公共样式在 App.vue 全局，这里留空即可 */
</style>