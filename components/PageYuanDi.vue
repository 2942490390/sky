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
			<button class="sky-btn" :class="{ 'sky-btn-stop': autoRunning }" @click="qtpt()" @touchstart="preventTouch">
				{{ autoRunning ? '停止跑图' : '执行' }}
			</button>
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
import { ref } from 'vue'
import { startInPlaceWing, stopInPlaceWing, isInPlaceWingRunning } from '@/common/in-place/inPlaceWing.js'
import { startAutoRunMap, stopAutoRunMap } from '@/common/in-place/autoRunMap.js'

const autoRunning = ref(false)

function preventTouch(e) {
	e.stopPropagation()
}

function mrrw() { console.log('mrrw') }
function ydrl() { console.log('ydrl') }
function hddb() { console.log('hddb') }
function ydxg() { console.log('ydxg') }

// ===== 切图跑图（核心） =====
async function qtpt() {
	if (autoRunning.value) {
		uni.showModal({
			title: '停止跑图',
			content: '是否停止当前的跑图任务？',
			confirmText: '停止',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					stopAutoRunMap()
					autoRunning.value = false
					uni.showToast({ icon: 'none', title: '已停止跑图' })
				}
			}
		})
		return
	}

	uni.showModal({
		title: '切图跑图',
		content: '将自动前往遇境，开启自燃、炸花，并按顺序传送吸火。是否开始？',
		confirmText: '开始',
		cancelText: '取消',
		success: async (res) => {
			if (!res.confirm) return

			autoRunning.value = true

			// ★ 这里定义了切图跑图的路线，直接使用任意门的 warpId
			const runList = [
				// 晨岛
				{ warpId: 'Dawn', name: '晨岛' },
				{ warpId: 'DawnCave', name: '预言山谷' },
				{ warpId: 'Dawn_TrialsWater', name: '水之试炼' },
				{ warpId: 'Dawn_TrialsEarth', name: '土之试炼' },
				{ warpId: 'Dawn_TrialsAir', name: '风之试炼' },
				{ warpId: 'Dawn_TrialsFire', name: '火之试炼' },
				// 云野
				{ warpId: 'Prairie_ButterflyFields', name: '云野一图' },
				{ warpId: 'Prairie_Cave', name: '云野左图' },
				{ warpId: 'Prairie_NestAndKeeper', name: '云野右图' },
				{ warpId: 'Prairie_Island', name: '圣域群岛' },
				{ warpId: 'Prairie_Village', name: '云野三塔' },
				{ warpId: 'DayHubCave', name: '中央神坛' },
				{ warpId: 'DayEnd', name: '云野神殿' },
				// 雨林
				{ warpId: 'Rain', name: '雨林一图' },
				{ warpId: 'Skyway', name: '风行网道' },
				{ warpId: 'RainForest', name: '雨林二图' },
				{ warpId: 'RainShelter', name: '雨林副本' },
				{ warpId: 'Rain_Cave', name: '雨林副本洞穴' },
				{ warpId: 'RainMid', name: '雨林水母图' },
				{ warpId: 'RainEnd', name: '雨林神殿' },
				// 霞谷
				{ warpId: 'Sunset', name: '霞谷一图' },
				{ warpId: 'Sunset_Citadel', name: '霞光城' },
				{ warpId: 'SunsetColosseum', name: '落日竞技场' },
				{ warpId: 'SunsetEnd2', name: '霞谷神殿' },
				{ warpId: 'SunsetVillage', name: '圆梦村' },
				{ warpId: 'Sunset_YetiPark', name: '雪隐峰' },
				// 墓土
				{ warpId: 'DuskStart', name: '墓土起点' },
				{ warpId: 'Dusk', name: '墓土破庙' },
				{ warpId: 'DuskOasis', name: '失落方舟' },
				{ warpId: 'DuskGraveyard', name: '墓土龙图' },
				{ warpId: 'Dusk_CrabField', name: '墓土沉船' },
				{ warpId: 'DuskMid', name: '墓土古战场' },
				{ warpId: 'DuskEnd', name: '墓土神殿' },
				// 禁阁
				{ warpId: 'Night', name: '禁阁低层' },
				{ warpId: 'Night2', name: '禁阁高层' },
				{ warpId: 'NightEnd', name: '禁阁神殿' },
				{ warpId: 'NightDesert', name: '星光沙漠' },
			]
			uni.showToast({ icon: 'none', title: `开始跑图，共 ${runList.length} 个点`, duration: 2000 })

			const result = await startAutoRunMap(runList, (step, total, spot) => {
				console.log(`[进度] ${step}/${total} - ${spot.name}`)
			})

			autoRunning.value = false

			if (result.success) {
				uni.showToast({ icon: 'success', title: '跑图完成' })
			} else if (result.reason === 'cancelled') {
				uni.showToast({ icon: 'none', title: '已中断跑图' })
			} else {
				uni.showToast({ icon: 'none', title: '跑图失败: ' + (result.message || result.reason) })
			}
		}
	})
}

// ===== 原地光翼 =====
function ydgy() {
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
	h5gg.searchNumber('27491', 'I32', '0x130000000', '0x170000000')
	h5gg.searchNumber('27491', 'I32', '0x130000000', '0x170000000')
	h5gg.editAll('0', 'I32')
	uni.showToast({ icon: 'none', title: '快去领取' })
}
</script>

<style scoped>
.sky-btn-stop {
	background-color: #ff3b30 !important;
	color: #fff !important;
}
</style>