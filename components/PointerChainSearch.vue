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

				<!-- ★ 新增：主模块过滤开关 -->
				<view class="row filter-row">
					<view class="filter-switch" :class="{ on: mainModuleFilter }" @click="toggleMainFilter">
						<view class="switch-knob"></view>
					</view>
					<text class="filter-label">仅显示主模块指针链</text>
				</view>

				<!-- ★ 新增：保存到本地 -->
				<view class="row save-row" v-if="mainModuleFilter">
					<button id="saveLocal" :disabled="filteredChains.length === 0" @click="onSaveToLocal"
						@touchstart="preventTouch">
						💾 保存到本地 ({{ filteredChains.length }})
					</button>
					<button id="openLocal" @click="openLocalModal" @touchstart="preventTouch">
						📁 本地标识 ({{ savedTagsCount }})
					</button>
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

				<!-- ★ 新增：解析过滤结果 -->
				<button v-if="mainModuleFilter && filteredChains.length > 0" id="parseBtn" @click="onParseFiltered"
					@touchstart="preventTouch">
					🔍 解析结果 ({{ filteredChains.length }})
				</button>

				<!-- ★ 新增：打开本地标识管理 -->
				<button id="localMgrBtn" @click="openLocalModal" @touchstart="preventTouch">
					📁 本地标识
				</button>

				<a id="gotoWeb" href="https://env-00jy6kq4uyns-static.normal.cloudstatic.cn/桶.html" target="_blank"
					rel="noopener" @touchstart="preventTouch">跳转特征码对比</a>
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


		<!-- ★ 新增：本地标识管理弹窗 -->
		<view v-if="localModalVisible" class="modal-mask" @click="closeLocalModal">
			<view class="parse-modal local-modal" @click.stop>
				<view class="parse-head">
					<view class="parse-title">
						<text class="title-main">📁 本地标识管理</text>
						<text class="title-sub">共 {{ savedTagList.length }} 个标识</text>
					</view>
					<view class="parse-actions">
						<button class="mini-btn" @click="closeLocalModal">关闭</button>
					</view>
				</view>
				<scroll-view class="parse-body" scroll-y>
					<view v-if="savedTagList.length === 0" class="empty-tip">
						<text>暂无保存的标识，请先搜索并开启主模块过滤后保存</text>
					</view>
					<view v-for="(tag, i) in savedTagList" :key="tag.key" class="tag-item">
						<view class="tag-head">
							<text class="tag-index">#{{ i + 1 }}</text>
							<text class="tag-key">{{ tag.key }}</text>
							<text class="tag-count">{{ tag.chains.length }} 条链</text>
							<view class="item-spacer"></view>
							<button class="copy-btn" @click.stop="openVerifyModal(tag)">✅ 校验</button>
							<button class="copy-btn danger" @click.stop="deleteTag(tag.key)">🗑 删除</button>
						</view>
						<view class="tag-alias-row">
							<text class="alias-label">别名：</text>
							<input class="alias-input" :value="tag.alias" placeholder="点击设置别名"
								@change="(e) => setAlias(tag.key, e)" />
						</view>
						<view class="tag-meta">
							<text class="tag-time">保存于 {{ formatTime(tag.time) }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- ★ 新增：校验结果弹窗 -->
		<view v-if="verifyModalVisible" class="modal-mask" @click="closeVerifyModal">
			<view class="parse-modal verify-modal" @click.stop>
				<view class="parse-head verify-head">
					<view class="parse-title">
						<text class="title-main">🔎 校验结果 · {{ verifyTagAlias }}</text>
						<text class="title-sub">
							类型 {{ verifyType }} · 一致 {{ verifyOkCount }} / 共 {{ verifyResults.length }}
						</text>
					</view>
					<view class="parse-actions">
						<button class="mini-btn" @click="closeVerifyModal">关闭</button>
					</view>
				</view>

				<!-- 类型选择行 -->
				<view class="verify-type-bar">
					<text class="type-label">数据类型：</text>
					<view v-for="t in dataTypes" :key="t" class="type-chip" :class="{ active: verifyType === t }"
						@click="changeVerifyType(t)">
						{{ t }}
					</view>
					<view class="item-spacer"></view>
					<button class="mini-btn primary" @click="runVerify">重新校验</button>
				</view>

				<!-- 基准值输入 + 开始校验按钮 -->
				<view class="verify-base-bar">
					<text class="type-label">基准值（必填）：</text>
					<input class="base-input" v-model="verifyBaseValue" placeholder="输入要校验的数值" confirm-type="done"
						@confirm="runVerify" />
					<button class="verify-run-btn" @click="runVerify">开始校验</button>
				</view>

				<scroll-view class="parse-body" scroll-y>
					<view v-for="(r, i) in verifyResults" :key="i" class="parse-item"
						:class="{ 'is-broken': !r.ok, 'is-match': r.ok }">
						<view class="item-head">
							<text class="item-index">#{{ i + 1 }}</text>
							<text class="item-status" :class="r.ok ? 'status-ok' : 'status-broken'">
								{{ r.broken ? '❌ 断裂' : (r.ok ? '✅ 一致' : '⚠️ 不一致') }}
							</text>
							<view class="item-spacer"></view>
							<button class="copy-btn" @click.stop="copyToClipboard(r.chainStr)">📋 复制链</button>
						</view>
						<view class="chain-row">
							<text class="chain-label">链：</text>
							<text class="chain-text">{{ r.chainStr }}</text>
						</view>
						<template v-if="!r.broken">
							<view class="addr-row">
								<text class="addr-label">最终地址：</text>
								<text class="addr-text">0x{{ r.finalAddr }}</text>
							</view>
							<view class="verify-val-row">
								<text class="addr-label">{{ verifyType }} 值：</text>
								<text class="addr-text">{{ r.value }}</text>
								<text v-if="r.diff !== undefined && !r.ok" class="diff-text">
									(与基准差 {{ r.diff }})
								</text>
							</view>
						</template>
						<view v-else class="broken-tip">
							<text class="broken-text">⚠️ 第 {{ r.brokenLevel }} 层断裂</text>
							<text class="broken-addr">地址 0x{{ r.brokenAddr }}</text>
						</view>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- ★ 新增：指针链解析结果弹窗 -->
		<view v-if="parseModalVisible" class="modal-mask" @click="closeParseModal">
			<view class="parse-modal" @click.stop>
				<view class="parse-head">
					<view class="parse-title">
						<text class="title-main">🔗 指针链解析结果</text>
						<text class="title-sub">主模块 {{ mainModuleName }} · 共 {{ parseResults.length }} 条</text>
					</view>
					<view class="parse-actions">
						<button class="mini-btn primary" @click="copyAllChains">复制全部</button>
						<button class="mini-btn" @click="closeParseModal">关闭</button>
					</view>
				</view>
				<scroll-view class="parse-body" scroll-y>
					<view v-for="(item, i) in parseResults" :key="i" class="parse-item"
						:class="{ 'is-broken': item.broken }">
						<view class="item-head">
							<text class="item-index">#{{ i + 1 }}</text>
							<text class="item-status" :class="item.broken ? 'status-broken' : 'status-ok'">
								{{ item.broken ? '❌ 断裂' : '✅ 成功' }}
							</text>
							<view class="item-spacer"></view>
							<button class="copy-btn" @click.stop="copyOneChain(item)">📋 复制链</button>
						</view>
						<view v-if="item.broken" class="broken-tip">
							<text class="broken-text">⚠️ 第 {{ item.brokenLevel }} 层断裂</text>
							<text class="broken-addr">地址 0x{{ item.brokenAddr }}</text>
						</view>
						<view class="chain-row">
							<text class="chain-label">链：</text>
							<text class="chain-text">{{ item.chainStr }}</text>
						</view>
						<template v-if="!item.broken">
							<view class="addr-row">
								<text class="addr-label">最终地址：</text>
								<text class="addr-text">0x{{ item.finalAddr }}</text>
							</view>
							<view class="values-grid">
								<view class="val-cell"><text class="val-key">I8</text><text class="val-v">{{
									item.vals.I8 }}</text></view>
								<view class="val-cell"><text class="val-key">I16</text><text class="val-v">{{
									item.vals.I16 }}</text></view>
								<view class="val-cell"><text class="val-key">I32</text><text class="val-v">{{
									item.vals.I32 }}</text></view>
								<view class="val-cell"><text class="val-key">I64</text><text class="val-v">{{
									item.vals.I64 }}</text></view>
								<view class="val-cell"><text class="val-key">F32</text><text class="val-v">{{
									item.vals.F32 }}</text></view>
								<view class="val-cell"><text class="val-key">HEX</text><text class="val-v hex">{{
									item.vals.HEX }}</text></view>
							</view>
						</template>
					</view>
				</scroll-view>
			</view>
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




// ★ 新增：本地标识 & 校验状态
const LOCAL_STORAGE_KEY = 'pointer_chain_tags_v1'
const localModalVisible = ref(false)
const savedTagList = ref([])          // [{ key, alias, time, chains: [{module, baseOffset, chain}] }]
const savedTagsCount = computed(() => savedTagList.value.length)

// 校验
const dataTypes = ['I8', 'I16', 'I32', 'I64', 'F32']
const verifyModalVisible = ref(false)
const verifyTagKey = ref('')
const verifyTagAlias = ref('')
const verifyType = ref('I32')
const verifyBaseValue = ref('')
const verifyResults = ref([])
const verifyOkCount = computed(() => verifyResults.value.filter(r => r.ok).length)

// ★ 新增：主模块过滤 & 解析
const mainModuleFilter = ref(false)
const mainModuleName = ref('Sky-iOS-Gold')
const filteredChains = ref([])
const parseModalVisible = ref(false)
const parseResults = ref([])

// ============ 虚拟滚动状态 ============
const LINE_HEIGHT = 16
const BUFFER_LINES = 10

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


let filteredChainsRaw = []
// ★★★ 新增：UI 同步器专用非响应式缓冲
let logBuf = []                 // 无限日志缓冲，搜索热路径只写这里
let lastSyncedCount = 0         // 已同步到 allResults 的条数
let pendingChainCount = 0       // 非响应式计数
let pendingTip = ''             // 待写入 tipText 的文本
let syncRaf = null              // UI 同步器 rAF 句柄
const SYNC_BATCH_PER_FRAME = 3000   // 每帧最多搬 3000 条到响应式数组

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
// let flushTimer = null
// function scheduleFlush() {
// 	if (flushTimer) return
// 	flushTimer = setTimeout(() => {
// 		flushTimer = null
// 		triggerRef(allResults)   // ★ 手动触发响应式更新
// 	}, 80)
// }

// function addResult(text) {
// 	totalResultCount++
// 	if (allResults.value.length < MAX_LOG_ITEMS) {
// 		allResults.value.push(text)
// 		scheduleFlush()
// 	}
// 	chainCount.value = '已找到: ' + totalResultCount + ' 条' + (totalResultCount > MAX_LOG_ITEMS
// 		? ' (仅显示前' + MAX_LOG_ITEMS + '条)' : '')
// }

// ============ ★ UI 同步器（独立于搜索节奏）============
function scheduleSync() {
	if (syncRaf) return
	syncRaf = requestAnimationFrame(syncFrame)
}

function syncFrame() {
	syncRaf = null

	// 1) 日志增量
	const total = logBuf.length
	if (lastSyncedCount < total) {
		const arr = allResults.value
		const end = Math.min(total, lastSyncedCount + SYNC_BATCH_PER_FRAME)
		for (let i = lastSyncedCount; i < end; i++) arr.push(logBuf[i])
		lastSyncedCount = end
		triggerRef(allResults)
	}

	// ★ 2) 指针链 raw → 响应式（每帧一次）
	if (filteredChains.value.length !== filteredChainsRaw.length) {
		filteredChains.value = filteredChainsRaw.slice()
	}

	// 3) 计数文本
	if (pendingChainCount > 0) {
		const txt = '已找到: ' + pendingChainCount + ' 条'
		if (chainCount.value !== txt) chainCount.value = txt
	}

	// 4) 提示文本
	if (pendingTip && tipText.value !== pendingTip) {
		tipText.value = pendingTip
	}

	// 5) 还有没搬完的，下一帧继续
	if (lastSyncedCount < logBuf.length) scheduleSync()
}


function clearLog() {
	// 取消同步器
	if (syncRaf) { cancelAnimationFrame(syncRaf); syncRaf = null }
	// 清缓冲
	logBuf = []
	lastSyncedCount = 0
	pendingChainCount = 0
	pendingTip = ''
	totalResultCount = 0
	// 清响应式
	allResults.value = []
	triggerRef(allResults)
	currentScrollTop.value = 0
	scrollTopPx.value = 0
	chainCount.value = ''
	filteredChains.value = []
	filteredChainsRaw = []
}

// ============ 模块加载 ============
// function showTip(msg) { tipText.value = msg }


function showTip(msg) {
	pendingTip = msg
	scheduleSync()
}
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
	// ★ 主模块过滤分支
	if (mainModuleFilter.value) {
		const mainMod = findMainModule()
		if (mainMod) {
			const hit = addrInAnyRange(mainMod, address)
			if (hit) {
				const info = mainMod.name + ':0x' + (address - hit.startNum).toString(16) + (chain.length
					? ' -> ' + chain.join(' -> ') : '')
				if (!chainCache.has(info)) {
					chainCache.add(info)
					FoundChains.push(info)
					pendingChainCount++
					logBuf.push('[' + pendingChainCount + '] ' + info)
					filteredChainsRaw.push({                       // ★ 改这里
						module: mainMod.name,
						baseOffset: address - hit.startNum,
						chain: chain.slice()
					})
					scheduleSync()
				}
				return true
			}
		}
		return false
	}
	// 原逻辑
	if (SearchModule) {
		const hit = addrInAnyRange(SearchModule, address)
		if (!hit) return false
		const info = SearchModule.name + ':0x' + (address - hit.startNum).toString(16) + (chain.length
			? ' -> ' + chain.join(' -> ') : '')
		if (!chainCache.has(info)) {
			chainCache.add(info)
			FoundChains.push(info)
			pendingChainCount++
			logBuf.push('[' + pendingChainCount + '] ' + info)
			scheduleSync()
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
				pendingChainCount++
				logBuf.push('[' + pendingChainCount + '] ' + info)
				scheduleSync()
			}
			return true
		}
	}
	return false
}



// ★ 新增：查找主模块
function findMainModule() {
	const list = modulesCache || loadAllModules()
	for (let i = 0; i < list.length; i++) {
		if (list[i].name === mainModuleName.value) return list[i]
	}
	for (let i = 0; i < list.length; i++) {
		if (list[i].name.indexOf('Sky-iOS-Gold') >= 0) {
			mainModuleName.value = list[i].name
			return list[i]
		}
	}
	return null
}

// ★ 新增：读 64 位指针
function readPtr(addrNum) {
	try {
		const v = h5gg.getValue(toHexAddr(addrNum), 'I64')
		return Number(v) || 0
	} catch (e) { return 0 }
}

// ★ 新增：构建复制格式 Sky-iOS-Gold+0x529E8D0+0x1300+0x6C44
function buildChainStr(item) {
	// 模块名 + 小写 0x + 大写十六进制数值
	const parts = [item.module, '0x' + item.baseOffset.toString(16).toUpperCase()]
	for (let i = 0; i < item.chain.length; i++) {
		// 同样：小写 0x + 大写数值
		const val = item.chain[i].replace(/^0x/i, '') // 去掉之前可能带的 0x 或 0X
		parts.push('0x' + val.toUpperCase())
	}
	return parts.join('+')
}

function formatVal(v) {
	const n = Number(v)
	return isFinite(n) ? String(n) : 'NaN'
}
function formatFloat(v) {
	const n = Number(v)
	return isFinite(n) ? parseFloat(n.toFixed(6)).toString() : 'NaN'
}
function formatHex(v) {
	const n = Number(v)
	return isFinite(n) ? '0x' + (n >>> 0).toString(16).toUpperCase().padStart(8, '0') : '-'
}



// ============ ★ 新增：本地标识管理 ============
// 使用流程
// 保存：搜索 → 打开"仅显示主模块指针链" → 搜索完成 → 点 💾 保存到本地，以输入框地址（如 0x12345678）为 key 存到 localStorage

// 管理：点 📁 本地标识 打开列表，可输入别名、删除标识

// 校验：在标识行点 ✅ 校验 → 弹窗选类型（I8/I16/I32/I64/F32）→ 自动对每条链 getValue → 显示一致/不一致/断裂；也可填基准值做对比

// 重启后：localStorage 数据仍在，打开"本地标识"即可重新校验
function loadTagList() {
	try {
		const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
		if (!raw) { savedTagList.value = []; return }
		const arr = JSON.parse(raw)
		savedTagList.value = Array.isArray(arr) ? arr : []
	} catch (e) {
		console.error('loadTagList', e)
		savedTagList.value = []
	}
}

function persistTagList() {
	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedTagList.value))
	} catch (e) {
		console.error('persistTagList', e)
		uni.showToast({ title: '保存失败：存储空间可能已满', icon: 'none' })
	}
}

function openLocalModal() {
	loadTagList()
	localModalVisible.value = true
}

function closeLocalModal() { localModalVisible.value = false }

function setAlias(key, e) {
	const val = (e.target && e.target.value !== undefined) ? e.target.value : (e.detail?.value || '')
	const tag = savedTagList.value.find(t => t.key === key)
	if (tag) {
		tag.alias = String(val || '').trim()
		persistTagList()
		uni.showToast({ title: '别名已更新', icon: 'success', duration: 1000 })
	}
}

function deleteTag(key) {
	uni.showModal({
		title: '确认删除',
		content: '删除后不可恢复，是否继续？',
		success: (res) => {
			if (!res.confirm) return
			savedTagList.value = savedTagList.value.filter(t => t.key !== key)
			persistTagList()
			uni.showToast({ title: '已删除', icon: 'success', duration: 1000 })
		}
	})
}

function formatTime(ts) {
	if (!ts) return '-'
	const d = new Date(ts)
	const pad = n => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ★ 保存当前 filteredChains 到本地（以输入地址作为标识）
function onSaveToLocal() {
	// ★ 用 raw 确保是最新全量
	const list = filteredChainsRaw.length > filteredChains.value.length
		? filteredChainsRaw
		: filteredChains.value

	if (list.length === 0) {
		uni.showToast({ title: '没有可保存的指针链', icon: 'none' })
		return
	}
	// 标识 = 输入的数据地址（统一小写、去 0x 前缀再补回，避免格式差异）
	let key = String(dataAddr.value || '').trim().toLowerCase()
	if (!key) { uni.showToast({ title: '请先输入地址作为标识', icon: 'none' }); return }
	key = key.startsWith('0x') ? key : '0x' + key

	// 深拷贝，避免和运行时引用耦合
	const chainsCopy = list.map(c => ({
		module: c.module,
		baseOffset: c.baseOffset,
		chain: Array.isArray(c.chain) ? c.chain.slice() : []
	}))

	loadTagList()
	const existing = savedTagList.value.find(t => t.key === key)

	if (existing) {
		uni.showModal({
			title: '标识已存在',
			content: `标识 ${key} 已存在（${existing.alias || '无别名'}），是否覆盖？`,
			success: (res) => {
				if (!res.confirm) return
				existing.chains = chainsCopy
				existing.time = Date.now()
				persistTagList()
				uni.showToast({ title: '已覆盖保存', icon: 'success' })
			}
		})
	} else {
		savedTagList.value.push({
			key,
			alias: '',
			time: Date.now(),
			chains: chainsCopy
		})
		persistTagList()
		uni.showToast({ title: `已保存 ${chainsCopy.length} 条链`, icon: 'success' })
	}
}

// ============ ★ 新增：校验 ============
function openVerifyModal(tag) {
	verifyTagKey.value = tag.key
	verifyTagAlias.value = tag.alias ? `${tag.alias} (${tag.key})` : tag.key
	verifyBaseValue.value = ''
	verifyResults.value = []
	verifyModalVisible.value = true
}

function closeVerifyModal() { verifyModalVisible.value = false }

function changeVerifyType(t) {
	verifyType.value = t
}

// 按类型格式化读到的值
function readValueByType(addrStr, type) {
	try {
		const v = h5gg.getValue(addrStr, type)
		if (type === 'F32') {
			const n = Number(v)
			return isFinite(n) ? parseFloat(n.toFixed(6)).toString() : 'NaN'
		}
		return String(v)
	} catch (e) {
		return 'ERR'
	}
}

// 沿链解析到最终地址（只解析，不读值）
function resolveChainFinalAddr(item) {
	const mainMod = findMainModule()
	if (!mainMod) return { broken: true, brokenLevel: 0, brokenAddr: '主模块未找到' }
	const soBase = mainMod.startNum
	const chain = item.chain.map(s => hexToNum(s))
	let addr = soBase + item.baseOffset

	for (let i = 0; i < chain.length - 1; i++) {
		const ptr = readPtr(addr)
		if (ptr === 0) {
			// ★ 去掉 0x，因为模板里已经写了 0x
			return { broken: true, brokenLevel: i + 1, brokenAddr: toHexAddr(addr).substring(2).toUpperCase() }
		}
		addr = ptr + chain[i]
	}
	const finalPtr = readPtr(addr)
	if (finalPtr === 0) {
		return { broken: true, brokenLevel: chain.length, brokenAddr: toHexAddr(addr).substring(2).toUpperCase() }
	}
	const finalAddr = finalPtr + chain[chain.length - 1]
	return { broken: false, finalAddr }
}
function runVerify() {
	const tag = savedTagList.value.find(t => t.key === verifyTagKey.value)
	if (!tag) { uni.showToast({ title: '标识不存在', icon: 'none' }); return }

	const type = verifyType.value
	const baseInput = String(verifyBaseValue.value || '').trim()

	// ★★★ 没有输入基准值就不跑
	if (!baseInput) {
		uni.showToast({ title: '请先输入基准值', icon: 'none' })
		return
	}

	// 下面一致性判定直接用 baseInput，删掉 fallback 到第一条的逻辑
	const baseNum = Number(baseInput)
	const baseIsNum = isFinite(baseNum)
	const isFloatType = type === 'F32'
	const results = []

	for (let i = 0; i < tag.chains.length; i++) {
		const item = tag.chains[i]
		const chainStr = buildChainStr(item)
		const r = { chainStr, broken: false, ok: true, finalAddr: '', value: '' }
		try {
			const resolved = resolveChainFinalAddr(item)
			if (resolved.broken) {
				r.broken = true
				r.brokenLevel = resolved.brokenLevel
				r.brokenAddr = resolved.brokenAddr
				r.ok = false
				results.push(r)
				continue
			}
			r.finalAddr = toHexAddr(resolved.finalAddr).substring(2).toUpperCase()   // 显示用，去掉 0x
			const addrStr = toHexAddr(resolved.finalAddr)                             // ★ 传给 getValue
			r.value = readValueByType(addrStr, type)

			// ★ 直接和用户输入比对
			const v = r.value
			const vNum = Number(v)
			if (isFloatType) {
				if (isFinite(vNum) && baseIsNum) {
					r.ok = Math.abs(vNum - baseNum) < 1e-4
					if (!r.ok) r.diff = Math.abs(vNum - baseNum).toFixed(6)
				} else {
					r.ok = v === baseInput
				}
			} else {
				r.ok = v === baseInput
				if (!r.ok && isFinite(vNum) && baseIsNum) {
					r.diff = (vNum - baseNum).toString()
				}
			}
			results.push(r)
		} catch (e) {
			r.broken = true
			r.brokenLevel = 0
			r.brokenAddr = '异常:' + e.message
			r.ok = false
			results.push(r)
		}
	}

	verifyResults.value = results
}
// 复制工具已有 copyToClipboard，无需重复
// ★ 把数字地址转成 h5gg 能识别的 '0x...' 字符串（处理负数、大数）
function toHexAddr(n) {
	// 用 BigInt 兜底，避免 Number 精度丢失和负数
	try {
		let v = typeof n === 'bigint' ? n : BigInt(Math.trunc(Number(n)))
		if (v < 0n) v = v + (1n << 64n)   // 负数按 64 位无符号解释
		return '0x' + v.toString(16)
	} catch (e) {
		// 兜底：>>> 0 只处理 32 位，但至少不会崩
		return '0x' + (Number(n) >>> 0).toString(16)
	}
}

// ★ 新增：解析单条链（沿用 ispoint.html 的 getPtr 原理）
function parseSingleChain(item) {
	const result = {
		broken: false, brokenLevel: 0, brokenAddr: '', finalAddr: '',
		chainStr: buildChainStr(item),
		vals: { I8: '-', I16: '-', I32: '-', I64: '-', F32: '-', HEX: '-' }
	}
	const mainMod = findMainModule()
	if (!mainMod) {
		result.broken = true
		result.brokenLevel = 0
		result.brokenAddr = '主模块未找到'
		return result
	}
	const soBase = mainMod.startNum
	const chain = item.chain.map(s => hexToNum(s))
	let addr = soBase + item.baseOffset

	for (let i = 0; i < chain.length - 1; i++) {
		const ptr = readPtr(addr)
		if (ptr === 0) {
			result.broken = true
			result.brokenLevel = i + 1
			result.brokenAddr = toHexAddr(addr).substring(2).toUpperCase()
			return result
		}
		addr = ptr + chain[i]
	}
	const finalPtr = readPtr(addr)
	if (finalPtr === 0) {
		result.broken = true
		result.brokenLevel = chain.length
		result.brokenAddr = toHexAddr(addr).substring(2).toUpperCase()
		return result
	}
	const finalAddr = finalPtr + chain[chain.length - 1]
	result.finalAddr = toHexAddr(finalAddr).substring(2).toUpperCase()

	try {
		const a = toHexAddr(finalAddr)   // ★
		result.vals.I8 = formatVal(h5gg.getValue(a, 'I8'))
		result.vals.I16 = formatVal(h5gg.getValue(a, 'I16'))
		result.vals.I32 = formatVal(h5gg.getValue(a, 'I32'))
		result.vals.I64 = formatVal(h5gg.getValue(a, 'I64'))
		result.vals.F32 = formatFloat(h5gg.getValue(a, 'F32'))
		result.vals.HEX = formatHex(h5gg.getValue(a, 'U32'))
	} catch (e) { }
	return result
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
	filteredChainsRaw = []
	filteredChains.value = []
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
	scheduleSync()
	scheduleNextSlice()
}

function finishSearch() {
	if (schedulerTimer) {
		clearTimeout(schedulerTimer)
		schedulerTimer = null
	}
	stopFlag = true
	pauseFlag.value = false

	// ★ 停止同步器，一次性搬完剩余全部日志（不限条数）
	if (syncRaf) { cancelAnimationFrame(syncRaf); syncRaf = null }
	if (lastSyncedCount < logBuf.length) {
		const arr = allResults.value
		for (let i = lastSyncedCount; i < logBuf.length; i++) arr.push(logBuf[i])
		lastSyncedCount = logBuf.length
		triggerRef(allResults)
	}
	if (pendingChainCount > 0) {
		chainCount.value = '已找到: ' + pendingChainCount + ' 条'
	}

	const tip = '搜索完毕，找到 ' + FoundChains.length + ' 条'
	showTip(tip)
	tipText.value = tip          // 立即写一次，避免被 pendingTip 覆盖
	console.log(tip)
	setRunState(false)
	sliceState = null
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



// ★ 新增：切换主模块过滤
function toggleMainFilter() {
	mainModuleFilter.value = !mainModuleFilter.value
	showTip(mainModuleFilter.value
		? '已开启主模块过滤：只显示 ' + mainModuleName.value + ' 的指针链'
		: '已关闭主模块过滤：显示全部模块')
}

// ★ 新增：解析过滤结果
function onParseFiltered() {
	// ★ 用 raw 确保是最新全量（搜索中 filteredChains.value 落后一帧）
	const list = filteredChainsRaw.length > filteredChains.value.length
		? filteredChainsRaw
		: filteredChains.value

	if (list.length === 0) {
		showTip('没有可解析的指针链')
		return
	}
	showTip('正在解析 ' + list.length + ' 条...')
	const results = []
	for (let i = 0; i < list.length; i++) {
		try {
			results.push(parseSingleChain(list[i]))
		} catch (e) {
			results.push({
				broken: true, brokenLevel: 0, brokenAddr: '异常:' + e.message,
				finalAddr: '', chainStr: buildChainStr(list[i]),
				vals: { I8: '-', I16: '-', I32: '-', I64: '-', F32: '-', HEX: '-' }
			})
		}
	}
	parseResults.value = results
	parseModalVisible.value = true
	const ok = results.filter(r => !r.broken).length
	showTip(`解析完成：成功 ${ok} 条，断裂 ${results.length - ok} 条`)
}
function closeParseModal() { parseModalVisible.value = false }


function copyToClipboard(text) {
	if (typeof text !== 'string' || !text.trim()) {
		uni.showToast({ title: '复制内容为空', icon: 'none' })
		return
	}

	// 1. 优先使用现代浏览器 API（需要 HTTPS 和用户手势）
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(text).then(() => {
			uni.showToast({ title: '已复制', icon: 'success', duration: 1200 })
		}).catch((err) => {
			console.warn('navigator.clipboard 失败，尝试回退', err)
			// fallbackCopy(text)
		})
	} else {
		// 2. 回退方案：使用临时 textarea + execCommand
		fallbackCopy(text)
	}
}

function fallbackCopy(text) {
	const textarea = document.createElement('textarea')
	textarea.value = text
	textarea.style.position = 'fixed'
	textarea.style.left = '-9999px'
	textarea.style.top = '0'
	document.body.appendChild(textarea)

	// iOS Safari 需要先 focus 再 select
	textarea.focus()
	textarea.select()
	textarea.setSelectionRange(0, text.length)

	try {
		const successful = document.execCommand('copy')
		if (successful) {
			uni.showToast({ title: '已复制', icon: 'success', duration: 1200 })
		} else {
			uni.showToast({ title: '复制失败，请长按手动复制', icon: 'none' })
		}
	} catch (err) {
		console.error('execCommand 失败', err)
		uni.showToast({ title: '复制失败，请长按手动复制', icon: 'none' })
	} finally {
		document.body.removeChild(textarea)
	}
}

function copyOneChain(item) {
	copyToClipboard(item.chainStr)
}

function copyAllChains() {
	const allText = parseResults.value.map(r => r.chainStr).join('\n')
	copyToClipboard(allText)
}

// ===== 触摸事件处理 =====
function preventTouch(e) {
	e.stopPropagation()
}

// ============ 生命周期 ============
let resizeObserver = null

onMounted(() => {
	try { loadTagList() } catch (e) { }
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
	if (syncRaf) cancelAnimationFrame(syncRaf)      // ★
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

#gotoWeb {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 6px;
	border: none;
	border-radius: 4px;
	font-size: 12px;
	cursor: pointer;
	touch-action: manipulation;
	line-height: 1.2;
	margin: 0;
	background: #34c759;
	/* 和“关闭/打开”同绿色；想区分可换 #5856d6 */
	color: #fff;
	text-decoration: none;
	-webkit-tap-highlight-color: transparent;
}

#gotoWeb:active {
	opacity: 0.8;
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

/* ★ 新增：过滤开关 */
.filter-row {
	gap: 8px;
	height: auto;
	line-height: 1.4;
	padding: 2px 0;
}

.filter-switch {
	width: 40px;
	height: 22px;
	border-radius: 11px;
	background: #ddd;
	position: relative;
	transition: background .2s;
	flex-shrink: 0;
	cursor: pointer;
}

.filter-switch.on {
	background: #34c759;
}

.switch-knob {
	position: absolute;
	top: 2px;
	left: 2px;
	width: 18px;
	height: 18px;
	border-radius: 50%;
	background: #fff;
	box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
	transition: transform .2s;
}

.filter-switch.on .switch-knob {
	transform: translateX(18px);
}

.filter-label {
	font-size: 12px;
	color: #333;
	font-weight: 500;
}

#parseBtn {
	background: #5856d6;
	color: #fff;
	font-weight: 600;
}

/* ★ 新增：解析弹窗 */
.modal-mask {
	position: fixed;
	inset: 0;
	background: rgba(0, 0, 0, .5);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}

.parse-modal {
	background: #f7f8fa;
	width: 100%;
	max-width: 720px;
	max-height: 86vh;
	border-radius: 14px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 12px 40px rgba(0, 0, 0, .25);
	animation: modalIn .22s ease;
}

@keyframes modalIn {
	from {
		transform: translateY(16px) scale(.98);
		opacity: 0;
	}

	to {
		transform: translateY(0) scale(1);
		opacity: 1;
	}
}

.parse-head {
	background: linear-gradient(135deg, #5856d6, #7b6ef6);
	color: #fff;
	padding: 14px 16px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	flex-shrink: 0;
}

.parse-title {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.title-main {
	font-size: 15px;
	font-weight: 600;
}

.title-sub {
	font-size: 11px;
	opacity: .85;
	margin-top: 2px;
}

.parse-actions {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}

.mini-btn {
	padding: 6px 10px;
	border: none;
	border-radius: 6px;
	font-size: 11px;
	background: rgba(255, 255, 255, .22);
	color: #fff;
	cursor: pointer;
	line-height: 1.2;
}

.mini-btn.primary {
	background: rgba(255, 255, 255, .32);
	font-weight: 600;
}

.mini-btn:active {
	opacity: .8;
}

.parse-body {
	flex: 1;
	overflow-y: auto;
	padding: 10px;
	-webkit-overflow-scrolling: touch;
}

.parse-item {
	background: #fff;
	border-radius: 10px;
	padding: 10px 12px;
	margin-bottom: 8px;
	border-left: 3px solid #34c759;
	box-shadow: 0 1px 3px rgba(0, 0, 0, .06);
}

.parse-item.is-broken {
	border-left-color: #ff3b30;
	background: #fff7f6;
}

.item-head {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
}

.item-index {
	font-size: 12px;
	font-weight: 700;
	color: #5856d6;
	background: #eef0ff;
	border-radius: 4px;
	padding: 1px 6px;
}

.item-status {
	font-size: 11px;
	font-weight: 600;
}

.status-ok {
	color: #34c759;
}

.status-broken {
	color: #ff3b30;
}

.item-spacer {
	flex: 1;
}

.copy-btn {
	padding: 3px 8px;
	border: 1px solid #5856d6;
	background: #fff;
	color: #5856d6;
	border-radius: 6px;
	font-size: 11px;
	cursor: pointer;
	line-height: 1.3;
}

.copy-btn:active {
	background: #5856d6;
	color: #fff;
}

.broken-tip {
	display: flex;
	gap: 10px;
	background: #ffeceb;
	border-radius: 6px;
	padding: 6px 10px;
	margin-bottom: 6px;
	flex-wrap: wrap;
}

.broken-text {
	color: #ff3b30;
	font-size: 12px;
	font-weight: 600;
}

.broken-addr {
	color: #b85450;
	font-size: 11px;
	font-family: Menlo, monospace;
}

.chain-row {
	display: flex;
	align-items: flex-start;
	gap: 4px;
	margin-bottom: 4px;
}

.chain-label {
	font-size: 11px;
	color: #999;
	flex-shrink: 0;
}

.chain-text {
	font-family: Menlo, Consolas, monospace;
	font-size: 12px;
	color: #333;
	word-break: break-all;
	line-height: 1.4;
}

.addr-row {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-bottom: 6px;
}

.addr-label {
	font-size: 11px;
	color: #999;
	flex-shrink: 0;
}

.addr-text {
	font-family: Menlo, Consolas, monospace;
	font-size: 12px;
	color: #5856d6;
	font-weight: 600;
}

.values-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 4px;
}

@media (max-width: 480px) {
	.values-grid {
		grid-template-columns: repeat(2, 1fr);
	}
}

.val-cell {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: #f5f6f8;
	border-radius: 6px;
	padding: 4px 8px;
	gap: 6px;
	overflow: hidden;
}

.val-key {
	font-size: 10px;
	color: #888;
	font-weight: 600;
	flex-shrink: 0;
}

.val-v {
	font-family: Menlo, Consolas, monospace;
	font-size: 11px;
	color: #222;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	text-align: right;
}

.val-v.hex {
	color: #ff9500;
	font-weight: 600;
}

/* ★ 新增：保存行 */
.save-row {
	display: flex;
	gap: 6px;
	height: auto;
	padding: 2px 0;
}

.save-row button {
	flex: 1;
}

#saveLocal {
	background: #5856d6;
	color: #fff;
	font-weight: 600;
}

#openLocal {
	background: #0a84ff;
	color: #fff;
}

#localMgrBtn {
	background: #0a84ff;
	color: #fff;
}

/* ★ 新增：本地标识列表 */
.local-modal {
	max-width: 640px;
}

.empty-tip {
	padding: 30px 16px;
	text-align: center;
	color: #999;
	font-size: 13px;
}

.tag-item {
	background: #fff;
	border-radius: 10px;
	padding: 10px 12px;
	margin-bottom: 8px;
	border-left: 3px solid #0a84ff;
	box-shadow: 0 1px 3px rgba(0, 0, 0, .06);
}

.tag-head {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
	flex-wrap: wrap;
}

.tag-index {
	font-size: 12px;
	font-weight: 700;
	color: #0a84ff;
	background: #e6f2ff;
	border-radius: 4px;
	padding: 1px 6px;
}

.tag-key {
	font-family: Menlo, Consolas, monospace;
	font-size: 12px;
	color: #333;
	font-weight: 600;
}

.tag-count {
	font-size: 11px;
	color: #999;
}

.copy-btn.danger {
	border-color: #ff3b30;
	color: #ff3b30;
}

.copy-btn.danger:active {
	background: #ff3b30;
	color: #fff;
}

.tag-alias-row {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 4px;
}

.alias-label {
	font-size: 11px;
	color: #999;
	flex-shrink: 0;
}

.alias-input {
	flex: 1;
	height: 26px;
	border: 1px solid #ddd;
	border-radius: 6px;
	padding: 0 8px;
	font-size: 12px;
	background: #fff;
}

.tag-meta {
	font-size: 10px;
	color: #bbb;
}

/* ★ 新增：校验弹窗 */
.verify-modal {
	max-width: 720px;
}

.verify-head {
	background: linear-gradient(135deg, #0a84ff, #34c759);
}

.verify-type-bar {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 12px;
	background: #fff;
	border-bottom: 1px solid #eee;
	flex-wrap: wrap;
	flex-shrink: 0;
}

.type-label {
	font-size: 12px;
	color: #666;
	font-weight: 600;
}

.type-chip {
	padding: 4px 10px;
	border-radius: 14px;
	background: #f2f2f7;
	color: #555;
	font-size: 11px;
	font-weight: 600;
	cursor: pointer;
	font-family: Menlo, monospace;
}

.type-chip.active {
	background: #0a84ff;
	color: #fff;
}

.verify-base-bar {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 8px 12px;
	background: #fafbfc;
	border-bottom: 1px solid #eee;
	flex-shrink: 0;
}

.base-input {
	flex: 1;
	height: 28px;
	border: 1px solid #ddd;
	border-radius: 6px;
	padding: 0 8px;
	font-size: 12px;
	background: #fff;
}

.parse-item.is-match {
	border-left-color: #0a84ff;
}

.verify-val-row {
	display: flex;
	align-items: center;
	gap: 6px;
	flex-wrap: wrap;
}

.diff-text {
	font-size: 10px;
	color: #ff9500;
	font-family: Menlo, monospace;
}

/* ★ 新增：校验弹窗里的"开始校验"按钮（白底上有颜色） */
.verify-run-btn {
	padding: 0 14px;
	height: 28px;
	line-height: 28px;
	border: none;
	border-radius: 6px;
	font-size: 12px;
	font-weight: 600;
	background: #0a84ff;
	color: #fff;
	cursor: pointer;
	flex-shrink: 0;
	touch-action: manipulation;
}

.verify-run-btn:active {
	opacity: 0.8;
}
</style>