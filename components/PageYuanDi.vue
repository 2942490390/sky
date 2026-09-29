<template>
	<view class="page">
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-calendar-check"></text>
				<text>每日任务</text>
			</view>
			<button class="sky-btn" @click="mrrw()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-map"></text>
				<text>切图跑图</text>
			</view>
			<button class="sky-btn" @click="qtpt()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-fire-flame-curved"></text>
				<text>获取燃料</text>
			</view>
			<button class="sky-btn" @click="ydrl()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-solid fa-coins"></text>
				<text>活动代币</text>
			</view>
			<button class="sky-btn" @click="hddb()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-flag"></text>
				<text>原地赛道</text>
			</view>
			<button class="sky-btn" @click="ydxg()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-feather"></text>
				<text>原地光翼</text>
			</view>
			<button class="sky-btn" @click="ydgy()" @touchstart="preventTouch">执行</button>
		</view>
		<view class="sky-task">
			<view class="task-left">
				<text class="fa-regular fa-spa"></text>
				<text>季节任务</text>
			</view>
			<button class="sky-btn" @click="jjrw()" @touchstart="preventTouch">执行</button>
		</view>
	</view>
</template>

<script setup>
	// ===== iOS Safari 触摸事件处理 =====
	let touchStartTime = 0

	// 阻止默认触摸行为，避免Safari的默认行为干扰
	function preventTouch(e) {
		e.stopPropagation()
	}

	// ===== 原样保留的方法 =====
	function mrrw() {
		console.log('mrrw')
	}

	function qtpt() {
		console.log('qtpt')
	}

	function ydrl() {
		console.log('ydrl')
	}

	function hddb() {
		console.log('hddb')
	}

	function ydxg() {
		console.log('ydxg')
	}

	function ydgy() {
		console.log('ydgy')
	}

	function jjrw() {
		h5gg.searchNumber('27491', 'I32', '0x110000000', '0x200000000');
		h5gg.editAll('0', 'I32');
		uni.showToast({
			icon: 'none',
			title: '快去领取'
		})
	}
</script>