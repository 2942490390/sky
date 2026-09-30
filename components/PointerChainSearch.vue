<template>
	<view class="wrapper">
		<!-- ========== 顶部参数面板 ========== -->
		<view class="panel">
			<view id="paramContainer" v-show="paramVisible">
				<view class="row">
					<label>十六进制地址：</label>
					<input id="dataAddr" v-model="dataAddr" placeholder="0xxxxxxx" />
				</view>
				<view class="row">
					<label>最大搜索偏移：</label>
					<input id="maxOffset" v-model="maxOffset" placeholder="0x7000" />
				</view>
				<view class="row">
					<label>最大搜索层数：</label>
					<input id="maxLevel" v-model="maxLevel" placeholder="4" />
				</view>
				<view class="row">
					<label>搜索范围模块：</label>
					<select id="moduleSelect" class="native-select" :value="moduleIndex" @change="onModuleChange">
						<option v-for="(opt, i) in moduleOptions" :key="i" :value="i">{{ opt.label }}</option>
					</select>
				</view>
			</view>

			<view class="btn-bar">
				<button id="start" :disabled="isRunning" @click="onStart" @touchstart="preventTouch">开始搜索</button>
				<button id="pause" :disabled="!isRunning" @click="onPause" @touchstart="preventTouch">{{ pauseFlag ?
					'恢复' : '暂停' }}</button>
				<button id="stop" :disabled="!isRunning" @click="onStop" @touchstart="preventTouch">停止</button>
				<button id="clear" @click="onClear" @touchstart="preventTouch">清空日志</button>
				<button id="togglePanel" @click="onTogglePanel" @touchstart="preventTouch">{{ paramVisible ? '关闭' : '打开'
				}}</button>
			</view>

			<view id="logTip">
				<text id="tipText">{{ tipText }}</text>
				<text class="count" id="chainCount">{{ chainCount }}</text>
			</view>
		</view>

		<!-- ========== 底部虚拟滚动日志 ========== -->
		<view class="panel log-panel">
			<scroll-view class="log-scroll" scroll-y :scroll-top="scrollTopPx" :scroll-with-animation="false"
				@scroll="onScroll" :style="{ height: '100%' }">
				<view class="log-spacer" :style="{ height: totalHeight + 'px' }">
					<view class="log-line" v-for="idx in visibleIndexes" :key="idx"
						:style="{ top: (idx * LINE_HEIGHT) + 'px' }">
						{{ allResults[idx] }}
					</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, shallowRef, triggerRef, onMounted, onUnmounted, nextTick } from 'vue'

// ============ 响应式 UI 状态 ============
const dataAddr = ref('')
const maxOffset = ref('0x8000')
const maxLevel = ref('4')
const moduleIndex = ref(0)
const moduleOptions = ref([{ label: '全部模块（不限定范围）', value: '__ALL__' }])
const paramVisible = ref(true)
const tipText = ref('就绪')
const chainCount = ref('')
const isRunning = ref(false)
const pauseFlag = ref(false)

// ============ 虚拟滚动状态 ============
const LINE_HEIGHT = 16
const BUFFER_LINES = 10
const MAX_LOG_ITEMS = 5000

// ★ 优化1: 用 shallowRef，push 不触发响应式
const allResults = shallowRef([])

const scrollTopPx = ref(0)
const currentScrollTop = ref(0)
const viewportHeight = ref(200)

const totalHeight = computed(() => allResults.value.length * LINE_HEIGHT + 20)

// ★ 优化2: 只计算可见区间索引，不创建对象
const visibleIndexes = computed(() => {
	const total = allResults.value.length
	if (total === 0) return []
	const start = Math.max(0, Math.floor(currentScrollTop.value / LINE_HEIGHT) - BUFFER_LINES)
	const end = Math.min(total, Math.ceil((currentScrollTop.value + viewportHeight.value) / LINE_HEIGHT) + BUFFER_LINES)
	const arr = []
	for (let i = start; i < end; i++) arr.push(i)
	return arr
})

// ============ 非响应式运行时状态 ============
let totalResultCount = 0
let stopFlag = false
let FoundChains = []
let SearchModule = null
let modulesCache = null
let modulesLoaded = false
let isPopulating = false
let chainCache = new Set()
let schedulerTimer = null
let sliceState = null
let logBoxHeight = 200

// ★ 优化3: 参数调优
const CANDIDATES_PER_SLICE = 1
const RESULTS_PER_SLICE = 50          // 从 200 降到 50
const TIME_SLICE_MS = 12              // 每轮最多占主线程 12ms
const GET_RESULTS_BATCH = 1000        // getResults 一次拉 1000 条

// ============ 工具函数 ============
const hexToNum = s => parseInt(String(s).trim(), 16) || 0

// ★ 优化4: MessageChannel 让出，比 setTimeout(0) 快
const yieldChannel = typeof MessageChannel !== 'undefined' ? new MessageChannel() : null
let yieldResolve = null
if (yieldChannel) {
	yieldChannel.port1.onmessage = () => {
		const r = yieldResolve
		yieldResolve = null
		if (r) r()
	}
}

function yieldToMain() {
	return new Promise(resolve => {
		if (yieldChannel) {
			yieldResolve = resolve
			yieldChannel.port2.postMessage(null)
		} else {
			setTimeout(resolve, 0)
		}
	})
}

// ============ 滚动处理（rAF 节流）============
let scrollRaf = null
let pendingScrollTop = 0
function onScroll(e) {
	pendingScrollTop = e.detail.scrollTop
	if (scrollRaf) return
	scrollRaf = requestAnimationFrame(() => {
		scrollRaf = null
		currentScrollTop.value = pendingScrollTop
	})
}

// ============ 日志接口（批量刷新）============
let flushTimer = null
function scheduleFlush() {
	if (flushTimer) return
	flushTimer = setTimeout(() => {
		flushTimer = null
		triggerRef(allResults)   // ★ 手动触发响应式更新
	}, 80)
}

function addResult(text) {
	totalResultCount++
	if (allResults.value.length < MAX_LOG_ITEMS) {
		allResults.value.push(text)
		scheduleFlush()
	}
	chainCount.value = '已找到: ' + totalResultCount + ' 条' + (totalResultCount > MAX_LOG_ITEMS
		? ' (仅显示前' + MAX_LOG_ITEMS + '条)' : '')
}

function clearLog() {
	if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
	allResults.value = []
	triggerRef(allResults)
	totalResultCount = 0
	currentScrollTop.value = 0
	scrollTopPx.value = 0
	chainCount.value = ''
}

// ============ 模块加载 ============
function showTip(msg) { tipText.value = msg }
function setRunState(r) { isRunning.value = r }

function loadAllModules() {
	if (modulesLoaded && modulesCache) return modulesCache
	const all = h5gg.getRangesList()
	const map = {}
	for (let i = 0; i < all.length; i++) {
		const m = all[i]
		let s = Number(m.start), e = Number(m.end)
		if (!s || !e || e <= s) continue
		let full = m.name || 'unknown', short = full
		const ix = full.lastIndexOf('/')
		if (ix >= 0) short = full.substring(ix + 1)
		if (!map[short]) {
			map[short] = { name: short, fullName: full, ranges: [], startNum: s, endNum: e }
		}
		map[short].ranges.push({ startNum: s, endNum: e, name: full })
		if (s < map[short].startNum) map[short].startNum = s
		if (e > map[short].endNum) map[short].endNum = e
	}
	const list = []
	for (const k in map) list.push(map[k])
	list.sort((a, b) => a.name.localeCompare(b.name))
	modulesCache = list
	modulesLoaded = true
	return list
}

function populateModuleSelect() {
	if (isPopulating) return
	isPopulating = true
	try {
		const list = loadAllModules()
		const opts = [{ label: '全部模块（不限定范围）', value: '__ALL__' }]
		for (let i = 0; i < list.length; i++) {
			const m = list[i]
			opts.push({
				label: m.name + ' [0x' + m.startNum.toString(16) + '~0x' + m.endNum.toString(16) + ']',
				value: String(i)
			})
		}
		moduleOptions.value = opts
		moduleIndex.value = 0
	} finally {
		isPopulating = false
	}
}

function resolveSearchModule() {
	const v = moduleOptions.value[moduleIndex.value]?.value
	if (v === '__ALL__' || v === undefined) return null
	const idx = parseInt(v, 10)
	return (modulesCache && idx >= 0 && idx < modulesCache.length) ? modulesCache[idx] : null
}

function addrInAnyRange(mod, address) {
	if (mod.ranges) {
		for (let i = 0; i < mod.ranges.length; i++) {
			if (address >= mod.ranges[i].startNum && address <= mod.ranges[i].endNum) return mod.ranges[i]
		}
	}
	if (address >= mod.startNum && address <= mod.endNum) return { startNum: mod.startNum }
	return null
}

function checkInModule(address, chain) {
	if (SearchModule) {
		const hit = addrInAnyRange(SearchModule, address)
		if (!hit) return false
		const info = SearchModule.name + ':0x' + (address - hit.startNum).toString(16) + (chain.length
			? ' -> ' + chain.join(' -> ') : '')
		if (!chainCache.has(info)) {
			chainCache.add(info)
			FoundChains.push(info)
			addResult('[' + FoundChains.length + '] ' + info)
		}
		return true
	}
	const list = modulesCache || []
	for (let i = 0; i < list.length; i++) {
		const hit = addrInAnyRange(list[i], address)
		if (hit) {
			const info = list[i].name + ':0x' + (address - hit.startNum).toString(16) + (chain.length
				? ' -> ' + chain.join(' -> ') : '')
			if (!chainCache.has(info)) {
				chainCache.add(info)
				FoundChains.push(info)
				addResult('[' + FoundChains.length + '] ' + info)
			}
			return true
		}
	}
	return false
}

// ============ 切片调度器（核心优化）============
function processCandidateSlice() {
	return new Promise((resolve) => {
		const st = sliceState
		if (!st) { resolve(); return }
		const sliceStart = performance.now()
		let processed = 0
		// ★ 优化5: 时间片预算 + 暂停立即生效
		while (
			processed < RESULTS_PER_SLICE &&
			st.skip < st.count &&
			!stopFlag &&
			!pauseFlag.value &&
			(performance.now() - sliceStart) < TIME_SLICE_MS
		) {
			const take = Math.min(GET_RESULTS_BATCH, st.count - st.skip)
			let part = []
			try {
				part = h5gg.getResults(take, st.skip)
			} catch (e) {
				part = []
			}
			if (!part || part.length === 0) {
				st.skip = st.count
				break
			}
			// ★ 优化6: 局部变量缓存，避免属性查找
			const curAddr = st.curAddr
			const maxOffset = st.maxOffset
			const curChain = st.curItem.chain
			const visited = st.visitedThisLevel
			const nextLevel = st.nextLevel
			for (let j = 0; j < part.length; j++) {
				const obj = part[j]
				const ptrValue = Number(obj.value), ptrAddr = Number(obj.address)
				if ((ptrValue & 7) !== 0) continue
				if (ptrValue < 0x1000) continue
				const offset = curAddr - ptrValue
				if (offset <= 0 || offset > maxOffset) continue
				const newChain = ['0x' + offset.toString(16)].concat(curChain)
				checkInModule(ptrAddr, newChain)
				if (!visited.has(ptrAddr)) {
					visited.add(ptrAddr)
					nextLevel.push({ addr: ptrAddr, chain: newChain })
				}
			}
			st.skip += part.length
			processed += part.length
		}
		resolve()
	})
}

async function runOneCandidate() {
	const st = sliceState
	if (!st) return
	const curItem = st.levelResults[st.idx]
	st.curItem = curItem
	st.curAddr = Number(curItem.addr)

	const valStart = Math.max(st.curAddr - st.maxOffset, 0x1000)
	const valEnd = st.curAddr
	h5gg.clearResults()
	try {
		h5gg.searchNumber(valStart + '~' + valEnd, 'U64', '0x0', '0x300000000')
	} catch (e) { }
	st.count = h5gg.getResultsCount()

	// ★ 优化7: count=0 直接返回，不做 getResults 循环
	if (st.count === 0) {
		st.skip = 0
		return
	}

	showTip('第' + (st.level + 1) + '层 ' + (st.idx + 1) + '/' + st.levelResults.length + ' => ' + st.count + '个')
	st.skip = 0

	while (st.skip < st.count && !stopFlag && !pauseFlag.value && sliceState === st) {
		await processCandidateSlice()
		await yieldToMain()
	}
}

function scheduleNextSlice() {
	if (schedulerTimer) {
		clearTimeout(schedulerTimer)
		schedulerTimer = null
	}
	if (pauseFlag.value && !stopFlag) return

	schedulerTimer = setTimeout(async () => {
		const st = sliceState
		if (!st || stopFlag) { finishSearch(); return }

		if (st.idx >= st.levelResults.length) {
			st.levelResults = st.nextLevel
			st.nextLevel = []
			st.visitedThisLevel = new Set()
			st.idx = 0
			st.level++
			if (st.level >= st.maxLevel || st.levelResults.length === 0) { finishSearch(); return }
			const seen = new Set(), uniq = []
			for (const it of st.levelResults) {
				if (!seen.has(it.addr)) { seen.add(it.addr); uniq.push(it) }
			}
			st.levelResults = uniq
			showTip('第' + (st.level + 1) + '层 候选' + st.levelResults.length + '个')
		}

		let done = 0
		while (done < CANDIDATES_PER_SLICE && st.idx < st.levelResults.length && !stopFlag && !pauseFlag.value) {
			await runOneCandidate()
			st.idx++
			done++
		}

		if (stopFlag) { finishSearch(); return }
		if (pauseFlag.value) return   // ★ 暂停时不继续调度
		scheduleNextSlice()
	}, 0)
}

function startSearch(dataAddress, maxOffsetNum, maxLevelNum) {
	stopFlag = false
	pauseFlag.value = false
	FoundChains = []
	chainCache.clear()
	sliceState = {
		level: 0,
		maxLevel: maxLevelNum,
		maxOffset: maxOffsetNum,
		levelResults: [{ addr: dataAddress, chain: [] }],
		idx: 0,
		nextLevel: [],
		visitedThisLevel: new Set(),
		curItem: null,
		curAddr: 0,
		count: 0,
		skip: 0
	}
	scheduleNextSlice()
}

function finishSearch() {
	if (schedulerTimer) {
		clearTimeout(schedulerTimer)
		schedulerTimer = null
	}
	stopFlag = true
	pauseFlag.value = false
	const tip = '搜索完毕，找到 ' + FoundChains.length + ' 条'
	showTip(tip)
	console.log(tip)
	setRunState(false)
	sliceState = null
	// ★ 确保最后一批日志刷新
	if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
	triggerRef(allResults)
}

// ============ 按钮事件 ============
function onStart() {
	if (isRunning.value) return
	if (!modulesLoaded) populateModuleSelect()
	clearLog()

	const dataAddress = hexToNum(dataAddr.value)
	const maxOffsetNum = hexToNum(maxOffset.value)
	const maxLevelNum = parseInt(maxLevel.value)
	if (!dataAddress || !maxOffsetNum || !maxLevelNum) { showTip('参数有误'); return }
	if (h5gg.getValue(dataAddress, 'I8') === '') { showTip('无效数据地址'); return }
	SearchModule = resolveSearchModule()
	showTip('开始搜索... 模块:' + (SearchModule ? SearchModule.name : '全部'))
	setRunState(true)
	startSearch(dataAddress, maxOffsetNum, maxLevelNum)
}

function onPause() {
	pauseFlag.value = !pauseFlag.value
	if (pauseFlag.value) {
		showTip('已暂停（等待当前步骤结束）')
	} else {
		showTip('恢复搜索...')
		if (isRunning.value) scheduleNextSlice()
	}
}

function onStop() {
	stopFlag = true
	pauseFlag.value = false
	showTip('正在停止...')
	if (schedulerTimer) {
		clearTimeout(schedulerTimer)
		schedulerTimer = null
	}
	finishSearch()
	sliceState = null
}

function onClear() {
	if (isRunning.value) { showTip('搜索中不可清空'); return }
	clearLog()
}

function onTogglePanel() {
	paramVisible.value = !paramVisible.value
}

function onModuleChange(e) {
	const val = e.target && e.target.value !== undefined
		? e.target.value
		: e.detail && e.detail.value
	moduleIndex.value = parseInt(val, 10) || 0
}

// ===== 触摸事件处理 =====
function preventTouch(e) {
	e.stopPropagation()
}

// ============ 生命周期 ============
let resizeObserver = null

onMounted(() => {
	if (typeof h5gg === 'undefined') {
		uni.showToast({ title: 'h5gg 未定义', icon: 'none' })
		return
	}
	try { h5gg.require(7.8) } catch (e) { }

	nextTick(() => {
		try { populateModuleSelect() } catch (e) { console.error(e) }

		const query = uni.createSelectorQuery()
		query.select('.log-scroll').boundingClientRect(rect => {
			if (rect && rect.height) {
				viewportHeight.value = rect.height
				logBoxHeight = rect.height
			}
		}).exec()
	})

	if (typeof window !== 'undefined' && window.ResizeObserver) {
		try {
			const el = document.querySelector('.log-scroll')
			if (el) {
				resizeObserver = new ResizeObserver(() => {
					const r = el.getBoundingClientRect()
					if (r.height) viewportHeight.value = r.height
				})
				resizeObserver.observe(el)
			}
		} catch (e) { }
	}
})

onUnmounted(() => {
	if (schedulerTimer) clearTimeout(schedulerTimer)
	if (scrollRaf) cancelAnimationFrame(scrollRaf)
	if (flushTimer) clearTimeout(flushTimer)
	if (resizeObserver) resizeObserver.disconnect()
})
</script>

<style scoped>
.wrapper {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.panel {
	background: #fff;
	border-radius: 8px;
	padding: 2px;
	width: 100%;
	flex-shrink: 0;
	color: #333;
}

.panel.log-panel {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.row {
	display: flex;
	flex-wrap: wrap;
	/* gap: 6px; */
	align-items: center;
	margin-bottom: 4px;
	height: 30px;
	line-height: 30px;
}

.row:last-child {
	margin-bottom: 4px;
}

.row input {
	height: 100%;
}

label {
	color: #333;
	font-size: 12px;
}

input {
	flex: 1;
	border: 1px solid #ddd;
	border-radius: 4px;
	min-width: 140px;
	font-size: 12px;
	outline: none;
	background: #fff;
	color: #333;
	padding-left: 4px;
}

input:focus {
	border-color: #007aff;
}

select.native-select {
	flex: 1;
	min-width: 140px;
	padding: 4px 6px;
	border: 1px solid #ddd;
	border-radius: 4px;
	font-size: 12px;
	background: #fff;
	color: #333;
	height: 26px;
	box-sizing: border-box;
	outline: none;
	/* 去掉 iOS 默认圆角 */
	-webkit-appearance: none;
	appearance: none;
	/* 自绘下拉箭头 */
	background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 6px center;
	padding-right: 22px;
}

select.native-select:focus {
	border-color: #007aff;
}

.btn-bar {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

button {
	padding: 6px;
	border: none;
	border-radius: 4px;
	font-size: 12px;
	cursor: pointer;
	touch-action: manipulation;
	line-height: 1.2;
	margin: 0;
}

button::after {
	border: none;
}

#start {
	background: #007aff;
	color: #fff;
}

#pause {
	background: #ff9500;
	color: #fff;
}

#stop {
	background: #ff3b30;
	color: #fff;
}

#clear {
	background: #8e8e93;
	color: #fff;
}

#togglePanel {
	background: #34c759;
	color: #fff;
}

button[disabled] {
	opacity: 0.5;
	pointer-events: none;
}

#logTip {
	color: #333;
	padding-top: 2px;
	background: #fdfdfd;
	font-size: 12px;
	display: flex;
	justify-content: space-between;
}

#logTip .count {
	color: #007aff;
	font-weight: bold;
}

/* ========== 虚拟滚动日志区 ========== */
.log-scroll {
	flex: 1;
	min-height: 100px;
	width: 100%;
	background: #fdfdfd;
	border-radius: 6px;
	overflow: hidden;
}

.log-spacer {
	position: relative;
	width: 100%;
}

.log-line {
	position: absolute;
	left: 0;
	right: 0;
	height: 16px;
	line-height: 16px;
	padding: 0 4px;
	font-size: 12px;
	color: #005ea5;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-family: -apple-system, system-ui, sans-serif;
}
</style>