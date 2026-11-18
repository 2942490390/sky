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
				<text>获取染料</text>
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
import { startInPlaceWing, stopInPlaceWing, isInPlaceWingRunning } from '@/common/in-place/inPlaceWing.js'

// ===== 触摸处理 =====
function preventTouch(e) {
	e.stopPropagation()
}

function mrrw() { console.log('mrrw') }
function qtpt() { console.log('qtpt') }
function ydrl() { console.log('ydrl') }
function hddb() { console.log('hddb') }
function ydxg() { console.log('ydxg') }

// ===== 原地光翼 =====
function ydgy() {
	// 正在跑 → 询问是否停止
	if (isInPlaceWingRunning()) {
		uni.showModal({
			title: '原地光翼运行中',
			content: '是否停止当前任务？',
			confirmText: '停止',
			cancelText: '继续',
			success: (res) => {
				if (res.confirm) {
					stopInPlaceWing()
					uni.showToast({ icon: 'none', title: '已停止原地光翼' })
				}
			}
		})
		return
	}

	// 未运行 → 输入间隔
	uni.showModal({
		title: '原地光翼',
		editable: true,
		placeholderText: '默认50秒，可填5',
		content: '50',
		success: async (res) => {
			if (!res.confirm) return

			const raw = (res.content || '').trim()
			const delaySec = raw !== '' && Number(raw) > 0 ? Number(raw) : 50

			uni.showToast({ icon: 'none', title: `开始，间隔 ${delaySec} 秒`, duration: 1200 })

			const result = await startInPlaceWing({
				delaySec,
				onProgress: (msg) => {
					uni.showToast({ icon: 'none', title: msg, duration: 800 })
				}
			})

			if (result.ok) {
				uni.showToast({ icon: 'success', title: `完成 ${result.written}/${result.total}` })
			} else if (result.reason === 'cancelled') {
				uni.showToast({ icon: 'none', title: `已停止 ${result.written}/${result.total}` })
			} else if (result.reason === 'ptr-failed') {
				uni.showToast({ icon: 'none', title: '指针链获取失败' })
			} else if (result.reason === 'already-running') {
				uni.showToast({ icon: 'none', title: '已在运行中' })
			}
		}
	})
}

function jjrw() {
	h5gg.searchNumber('27491', 'I32', '0x110000000', '0x200000000');
	h5gg.editAll('0', 'I32');
	uni.showToast({ icon: 'none', title: '快去领取' })
}
</script>