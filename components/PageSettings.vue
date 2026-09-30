<template>
	<view class="page">
		<!-- 顶部操作栏 -->
		<view class="toolbar">
			<text class="title">指针链配置</text>
			<view class="tools">
				<view class="mini-btn add" @click="addRow">+ 新增</view>
				<view class="mini-btn reset" @click="onReset">恢复默认</view>
				<view class="mini-btn copy" @click="onCopy">复制JS</view>
				<view class="mini-btn import" @click="openImport">导入指针链</view>
			</view>
		</view>

		<!-- 配置列表 -->
		<scroll-view class="list" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true" @scroll="onScroll"
			:style="{ height: listHeight + 'px' }">
			<view ref="listContentRef" class="list-content">
				<view v-for="(item, idx) in list" :key="item.id" class="card"
					:class="{ 'card-active': idx === highlightIndex }">
					<!-- 第一行：功能 key 选择 + 删除 -->
					<view class="card-header">
						<select class="key-select" :value="getKeyIndex(item.key)" @change="e => onKeyChange(idx, e)">
							<option v-for="(fk, i) in functionKeys" :key="fk.key" :value="i">{{ fk.label }} ({{ fk.key
							}})</option>
						</select>
						<view class="mini-btn del" @click.stop="removeRow(idx)">删除</view>
						<view class="mini-btn paste" @click.stop="paste(idx)">粘贴</view>
					</view>

					<!-- 第二行：基址偏移 -->
					<view class="row">
						<text class="row-label">基址偏移</text>
						<input class="row-input" v-model="item.base" placeholder="0x54A3B48"
							@focus="onInputFocus(idx)" />
					</view>

					<!-- 第三行：多级偏移链 -->
					<view class="chain-block">
						<view class="chain-header">
							<text class="row-label">偏移链 ({{ item.chain.length }}/{{ MAX_CHAIN }})</text>
							<view class="mini-btn add-chain" :class="{ 'is-disabled': item.chain.length >= MAX_CHAIN }"
								@click.stop="item.chain.length >= MAX_CHAIN ? null : addChain(idx)">+ 加一级</view>
						</view>
						<view class="chain-list">
							<view v-for="(c, ci) in item.chain" :key="c.id" class="chain-item">
								<text class="chain-idx">[{{ ci }}]</text>
								<input class="chain-input" v-model="c.val" placeholder="0xC48"
									@focus="onInputFocus(idx)" />
								<view v-if="item.chain.length > 1" class="mini-btn del-chain"
									@click.stop="removeChain(idx, c.id)">×</view>
							</view>
						</view>
					</view>

					<!-- 预览 -->
					<view class="preview">
						<text class="preview-label">预览:</text>
						<text class="preview-code">{{ formatPreview(item) }}</text>
					</view>
				</view>

				<!-- 空状态 -->
				<view v-if="list.length === 0" class="empty">
					<text>暂无配置，点击「+ 新增」开始</text>
				</view>
			</view>
		</scroll-view>

		<!-- 底部保存按钮 -->
		<view class="footer">
			<view class="save-btn" @click="onSave">保存配置</view>
		</view>

		<!-- ========== 弹窗：选择要设定的功能 ========== -->
		<view v-if="showFuncPicker" class="modal-mask" @click.self="closeFuncPicker">
			<view class="modal-box">
				<view class="modal-title">选择要设定的功能</view>
				<scroll-view class="modal-list" scroll-y>
					<view v-for="fk in functionKeys" :key="fk.key" class="modal-item"
						:class="{ active: importTargetKey === fk.key }" @click="onModalItemClick(fk.key)">
						<text>{{ fk.label }}</text>
						<text class="modal-item-code">({{ fk.key }})</text>
					</view>
				</scroll-view>
				<view class="modal-footer">
					<view class="mini-btn reset" @click="closeFuncPicker">取消</view>
					<view class="mini-btn add" :class="{ 'is-disabled': !importTargetKey }"
						@click="importTargetKey && onFuncPicked()">确定</view>
				</view>
			</view>
		</view>

		<!-- ========== 弹窗：粘贴指针链 ========== -->
		<view v-if="pasteVisible" class="modal-mask" @click.self="closePaste">
			<view class="modal-box paste-box">
				<view class="modal-title">粘贴指针链</view>

				<view class="paste-hint">
					<text>支持格式（单条）：</text>
					<text class="paste-hint-code">Sky-iOS-Gold+0x529E8D0+0x1300+0x6C44</text>
					<text class="paste-hint-code">[Sky-iOS-Gold+0x4885C30]+0x108+0x4A24</text>
				</view>

				<textarea class="paste-textarea" v-model="pasteInput" placeholder="在此粘贴指针链..." auto-height
					:maxlength="512" />

				<view class="paste-footer">
					<view class="mini-btn reset" @click="closePaste">取消</view>
					<view class="mini-btn add" @click="confirmPaste">确定</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { loadOffsets, saveOffsets, resetOffsets, exportAsJS, getKeyOptions } from '@/common/offsetsStore.js'
import { getLabel } from '@/common/functionLabels.js'
import { clearOffsets, clearAllAddrCache } from '@/common/h5gg.js'
import { parseText, toChainPair, filterStableChains, checkHeader } from '@/common/pointerImporter.js'
import { readFileStream, extractFile } from '@/common/fileStreamReader.js'

const listHeight = ref(300)
const scrollTop = ref(0)
const listContentRef = ref(null)
const highlightIndex = ref(-1)

let currentScrollTop = 0
let isAutoScrolling = false
let contentHeight = 0
let viewportHeight = 0
let observer = null
let focusScrollTimer = null
let scrollFinalizeTimer = null
let scrollRequestId = 0

// ===== 唯一 id 生成器 =====
let _uid = 0
const genId = () => ++_uid

function makeChain(val = '0x0') {
	return { id: genId(), val }
}

function makeCard(key = '') {
	return {
		id: genId(),
		key: key || functionKeys[0].key,
		base: '0x0',
		chain: [makeChain()]
	}
}

// ===== 导入相关状态 =====
const showFuncPicker = ref(false)
const importTargetKey = ref('')

// 模态框项目点击
function onModalItemClick(key) {
	importTargetKey.value = key
}

// ===== 监听用户滚动 =====
function onScroll(e) {
	if (!e || !e.detail) return
	currentScrollTop = e.detail.scrollTop
	if (!isAutoScrolling) {
		if (scrollTop.value !== currentScrollTop) {
			scrollTop.value = currentScrollTop
		}
	}
}

function measureContent() {
	if (!listContentRef.value) return
	const el = listContentRef.value.$el || listContentRef.value
	if (el && typeof el.getBoundingClientRect === 'function') {
		const rect = el.getBoundingClientRect()
		contentHeight = Math.ceil(rect.height)
	}
}

function measureViewport() {
	return new Promise(resolve => {
		const query = uni.createSelectorQuery()
		query.select('.list').boundingClientRect(rect => {
			if (rect && rect.height) {
				viewportHeight = Math.ceil(rect.height)
			}
			resolve(viewportHeight)
		}).exec()
	})
}

async function scrollToIndex(idx) {
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 30))

	const query = uni.createSelectorQuery()
	const res = await new Promise(resolve => {
		query.select('.list-content').boundingClientRect()
		query.selectAll('.card').boundingClientRect()
		query.exec(resolve)
	})

	const contentRect = res[0]
	const cardRects = res[1]
	if (!contentRect || !cardRects || !cardRects[idx]) return

	const offsetInContent = cardRects[idx].top - contentRect.top
	const PADDING_TOP = 8
	let target = offsetInContent - PADDING_TOP

	measureContent()
	const visibleHeight = await measureViewport()
	const maxScroll = Math.max(0, contentHeight - (visibleHeight || listHeight.value))
	target = Math.max(0, Math.min(target, maxScroll))

	isAutoScrolling = true
	safeSetScrollTop(target)

	if (scrollFinalizeTimer) clearTimeout(scrollFinalizeTimer)
	scrollFinalizeTimer = setTimeout(() => {
		isAutoScrolling = false
		currentScrollTop = target
		safeSetScrollTop(target)
	}, 350)
}

function safeSetScrollTop(v) {
	if (!Number.isFinite(v)) return
	if (scrollTop.value === v) return
	try {
		scrollTop.value = v
	} catch (e) {
		// scroll-view 内部 main.value 未就绪，忽略
	}
}

function onInputFocus(idx) {
	const savedScrollTop = currentScrollTop

	if (focusScrollTimer) {
		clearTimeout(focusScrollTimer)
		focusScrollTimer = null
	}
	if (scrollFinalizeTimer) {
		clearTimeout(scrollFinalizeTimer)
		scrollFinalizeTimer = null
	}

	const restore = () => {
		isAutoScrolling = true
		scrollTop.value = savedScrollTop
		requestAnimationFrame(() => {
			setTimeout(() => {
				isAutoScrolling = false
				currentScrollTop = savedScrollTop
				scrollTop.value = savedScrollTop
			}, 30)
		})
	}

	restore()
	focusScrollTimer = setTimeout(restore, 100)
	focusScrollTimer = setTimeout(restore, 200)
}

/**
 * 解析粘贴的指针链文本
 * 支持：
 *   Sky-iOS-Gold+0x529E8D0+0x1300+0x6C44
 *   [Sky-iOS-Gold+0x4885C30]+0x108+0x4A24
 */
function parsePastedChain(text) {
	if (typeof text !== 'string') return null

	let s = text.trim().replace(/[\[\]]/g, '').trim()
	if (!s) return null

	const parts = s.split('+').map(p => p.trim()).filter(Boolean)
	if (parts.length < 2) return null

	let baseIdx = 1
	if (/^0x[0-9a-fA-F]+$/.test(parts[0])) {
		baseIdx = 0
	}

	const baseRaw = parts[baseIdx]
	if (!/^0x[0-9a-fA-F]+$/.test(baseRaw)) return null

	const chainRaw = parts.slice(baseIdx + 1)
	if (chainRaw.length === 0) return null

	for (const c of chainRaw) {
		if (!/^0x[0-9a-fA-F]+$/.test(c)) return null
	}

	const base = '0x' + parseInt(baseRaw, 16).toString(16).toUpperCase()
	const chain = chainRaw.map(c => '0x' + parseInt(c, 16).toString(16).toUpperCase())

	return { base, chain }
}

// ===== 粘贴弹窗状态 =====
const pasteVisible = ref(false)
const pasteInput = ref('')
const pasteTargetIndex = ref(-1)

async function paste(idx) {
	pasteTargetIndex.value = idx
	pasteInput.value = ''
	pasteVisible.value = true
}

function closePaste() {
	pasteVisible.value = false
	pasteInput.value = ''
	pasteTargetIndex.value = -1
}

async function confirmPaste() {
	const idx = pasteTargetIndex.value
	if (idx < 0 || idx >= list.value.length) {
		closePaste()
		return
	}

	const parsed = parsePastedChain(pasteInput.value)
	if (!parsed) {
		uni.showToast({
			icon: 'none',
			title: '格式错误',
			duration: 2000
		})
		return
	}

	// 写入列表（chain 转成 { id, val }）
	list.value[idx].base = parsed.base
	list.value[idx].chain = parsed.chain.map(v => makeChain(v))

	// 高亮提示
	highlightIndex.value = idx
	setTimeout(() => {
		highlightIndex.value = -1
	}, 1200)

	closePaste()

	uni.showToast({
		icon: 'success',
		title: '已替换',
		duration: 1000
	})

	await nextTick()
	await scrollToIndex(idx)
}

function setupObserver() {
	if (typeof MutationObserver === 'undefined') return
	if (!listContentRef.value) return
	const el = listContentRef.value.$el || listContentRef.value
	if (!el) return

	observer = new MutationObserver((mutations) => {
		measureContent()

		const hasAddedCard = mutations.some(m =>
			m.type === 'childList' &&
			m.addedNodes &&
			m.addedNodes.length > 0
		)
		if (!hasAddedCard) return

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				measureContent()
				const visibleHeight = viewportHeight || listHeight.value
				const maxScrollTop = Math.max(0, contentHeight - visibleHeight)

				if (maxScrollTop > 0 && Math.abs(currentScrollTop - maxScrollTop) > 2) {
					isAutoScrolling = true
					scrollTop.value = maxScrollTop

					if (scrollFinalizeTimer) clearTimeout(scrollFinalizeTimer)
					scrollFinalizeTimer = setTimeout(() => {
						isAutoScrolling = false
						currentScrollTop = maxScrollTop
						scrollTop.value = maxScrollTop
					}, 350)
				}
			})
		})
	})

	observer.observe(el, {
		childList: true,
		subtree: false,
		attributes: false,
		characterData: false
	})
}

const functionKeys = getKeyOptions()
const list = ref([])

function loadToList() {
	const offsets = loadOffsets()
	const arr = []
	for (const key in offsets) {
		const [base, chain] = offsets[key]
		arr.push({
			id: genId(),
			key,
			base: '0x' + Number(base).toString(16).toUpperCase(),
			chain: chain.map(n => makeChain('0x' + Number(n).toString(16).toUpperCase()))
		})
	}
	list.value = arr
}

onMounted(async () => {
	loadToList()

	const query = uni.createSelectorQuery()
	query.select('.page').boundingClientRect(rect => {
		if (rect) listHeight.value = Math.max(100, rect.height - 80)
	}).exec()

	await nextTick()
	await new Promise(r => requestAnimationFrame(r))
	await new Promise(r => requestAnimationFrame(r))
	await new Promise(r => setTimeout(r, 100))

	measureContent()
	measureViewport()
	setupObserver()
})

onUnmounted(() => {
	if (observer) {
		observer.disconnect()
		observer = null
	}
	if (focusScrollTimer) {
		clearTimeout(focusScrollTimer)
		focusScrollTimer = null
	}
	if (scrollFinalizeTimer) {
		clearTimeout(scrollFinalizeTimer)
		scrollFinalizeTimer = null
	}
})

function getKeyIndex(key) {
	const i = functionKeys.findIndex(f => f.key === key)
	return i >= 0 ? i : 0
}

function getKeyLabel(key) {
	return getLabel(key)
}

async function addRow() {
	list.value.push(makeCard())
}

function removeRow(idx) {
	list.value.splice(idx, 1)
}

function onKeyChange(idx, e) {
	const raw = e.target && e.target.value !== undefined ?
		e.target.value :
		e.detail && e.detail.value
	const i = parseInt(raw, 10)
	if (isNaN(i) || !functionKeys[i]) return
	list.value[idx].key = functionKeys[i].key
}

const MAX_CHAIN = 6

async function addChain(idx) {
	const item = list.value[idx]
	if (item.chain.length >= MAX_CHAIN) {
		uni.showToast({
			title: `最多 ${MAX_CHAIN} 级偏移`,
			icon: 'none'
		})
		return
	}

	item.chain.push(makeChain())
	await nextTick()
	await new Promise(resolve => setTimeout(resolve, 30))
	await scrollToIndex(idx)
}

// ★ 按 chainId 删除，天然幂等：找不到就 no-op
async function removeChain(idx, chainId) {
	const item = list.value[idx]
	if (!item) return
	const i = item.chain.findIndex(c => c.id === chainId)
	if (i === -1) return
	if (item.chain.length <= 1) return
	item.chain.splice(i, 1)
	await nextTick()
	await scrollToIndex(idx)
}

function formatPreview(item) {
	const chainStr = item.chain.map(c => c.val).join(', ')
	return `[${item.base}, [${chainStr}]]`
}

function onSave() {
	const seen = new Set()
	for (let i = 0; i < list.value.length; i++) {
		const item = list.value[i]
		if (!item.key) {
			uni.showToast({ title: `第 ${i + 1} 项未选择功能`, icon: 'none' })
			return
		}
		if (seen.has(item.key)) {
			uni.showToast({ title: `功能 ${item.key} 重复`, icon: 'none' })
			return
		}
		seen.add(item.key)
	}

	const offsets = {}
	for (const item of list.value) {
		const base = parseInt(item.base, 16)
		const chain = item.chain.map(c => parseInt(c.val, 16)).filter(n => !isNaN(n))
		if (isNaN(base)) {
			uni.showToast({ title: `基址 ${item.base} 无效`, icon: 'none' })
			return
		}
		offsets[item.key] = [base, chain]
	}

	if (saveOffsets(offsets)) {
		clearOffsets()
		clearAllAddrCache()
		uni.showToast({ title: '保存成功', icon: 'success' })
	} else {
		uni.showToast({ title: '保存失败', icon: 'none' })
	}
}

function onReset() {
	uni.showModal({
		title: '恢复默认',
		content: '确定要恢复默认配置吗？当前配置会被覆盖。',
		success: (res) => {
			if (res.confirm) {
				resetOffsets()
				loadToList()
				uni.showToast({ title: '已恢复默认', icon: 'success' })
			}
		}
	})
}

function onCopy() {
	const offsets = loadOffsets()
	const jsCode = exportAsJS(offsets)
	uni.setClipboardData({
		data: jsCode,
		success: () => {
			uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
		}
	})
}

// ================= 导入指针链 =================

function openImport() {
	if (functionKeys.length === 0) {
		uni.showToast({ title: '没有可选功能', icon: 'none' })
		return
	}
	importTargetKey.value = functionKeys[0].key
	showFuncPicker.value = true
}

function closeFuncPicker() {
	showFuncPicker.value = false
}

function onFuncPicked() {
	if (!importTargetKey.value) return
	showFuncPicker.value = false
	choosePointerFile()
}

function choosePointerFile() {
	// #ifdef H5
	if (typeof document !== 'undefined' && document.body) {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.txt,text/plain'
		input.style.position = 'fixed'
		input.style.left = '-10000px'
		input.style.top = '0'
		input.style.width = '1px'
		input.style.height = '1px'
		input.style.opacity = '0'
		input.setAttribute('aria-hidden', 'true')
		document.body.appendChild(input)

		let cleaned = false
		const cleanup = () => {
			if (cleaned) return
			cleaned = true
			if (input.parentNode) input.parentNode.removeChild(input)
		}
		input.addEventListener('change', (event) => {
			const file = event.target.files && event.target.files[0]
			cleanup()
			if (file) handlePickedFile(file)
		}, { once: true })
		input.click()
		return
	}

	uni.showToast({ title: '当前环境不支持文件选择', icon: 'none' })
	// #endif

	// #ifndef H5
	if (typeof h5gg === 'undefined' || typeof h5gg.pickScriptFile !== 'function') {
		uni.showToast({ title: '当前环境不支持文件选择', icon: 'none' })
		return
	}
	h5gg.pickScriptFile(function (filePath) {
		if (!filePath) return
		handlePickedFile(filePath)
	})
	// #endif
}

async function handlePickedFile(input) {
	const MAX_VERIFY = 50
	let lastUpdate = 0

	function updateProgress(text, force = false) {
		const now = Date.now()
		if (!force && now - lastUpdate < 80) return
		lastUpdate = now
		uni.showLoading({ title: text, mask: true })
	}

	uni.showLoading({ title: '准备中 0%', mask: true })

	try {
		let text = ''
		const fileObj = extractFile(input)

		if (fileObj) {
			console.log('[handlePickedFile] 用 File 对象流式读取')
			text = await readFileStream(
				fileObj,
				(read, total) => {
					const pct = total > 0 ? Math.floor((read / total) * 30) : 0
					updateProgress(`读取中${pct}%`)
				},
				64 * 1024
			)
		} else if (typeof input === 'string') {
			console.log('[handlePickedFile] 用路径读取')
			const { readFileByPath } = await import('@/common/fileReader.js')
			text = await readFileByPath(input, (read, total) => {
				const pct = total > 0 ? Math.floor((read / total) * 30) : 0
				updateProgress(`读取中 ${pct}%`)
			})
		} else {
			throw new Error('未知的文件输入类型')
		}

		console.log('[handlePickedFile] 读取完成，长度:', text.length)

		updateProgress('识别文件格式 30%', true)
		const headerInfo = checkHeader(text)
		console.log('[handlePickedFile] 文件头信息:', headerInfo)

		updateProgress('解析中 35%', true)
		const raw = parseText(text, 'Sky-iOS-Gold')
		console.log('[handlePickedFile] 解析出原始条目:', raw.length)

		if (raw.length === 0) {
			uni.hideLoading()
			uni.showToast({
				title: '未找到可解析的指针链\n支持 MemoryTool 导出 / Sky-iOS-Gold+0x... 行',
				icon: 'none',
				duration: 3500
			})
			return
		}

		const allItems = raw.map(toChainPair)
		const items = allItems.slice(0, MAX_VERIFY)
		console.log('[handlePickedFile] 取前', items.length, '条验证（总共', allItems.length, '条）')

		updateProgress(`解析完成 共${allItems.length}条 / 验证${items.length}条 40%`, true)

		const verified = await filterStableChains(
			items,
			typeof h5gg !== 'undefined' ? h5gg : null,
			() => {
				if (typeof h5gg === 'undefined') return null
				const l = h5gg.getRangesList(0)
				return (l && l.length) ? { mainBase: l[0].start } : null
			},
			(done, total, currentItem, isStable) => {
				const pct = 40 + Math.floor((done / total) * 55)
				const flag = isStable ? '✓' : '✗'
				updateProgress(`验证${flag} ${done}/${total} ${pct}%`)
			}
		)

		console.log('[handlePickedFile] 验证通过:', verified.length, '条')

		updateProgress('完成 100%', true)
		await new Promise(r => setTimeout(r, 200))
		uni.hideLoading()

		if (verified.length === 0) {
			uni.showToast({
				title: '没有可用的指针链（全部断裂）',
				icon: 'none',
				duration: 3000
			})
			return
		}

		uni.showToast({
			title: `可用 ${verified.length} / ${items.length} 条`,
			icon: 'success',
			duration: 1800
		})

		await applyChainToTarget(verified[0])

	} catch (e) {
		console.error('[handlePickedFile] 失败', e)
		uni.hideLoading()
		uni.showToast({
			title: '导入失败：' + (e.message || e),
			icon: 'none',
			duration: 3000
		})
	}
}

async function applyChainToTarget(c) {
	if (!c) return
	const key = importTargetKey.value
	if (!key) return

	let idx = list.value.findIndex(it => it.key === key)
	if (idx === -1) {
		list.value.push(makeCard(key))
		idx = list.value.length - 1
	}

	list.value[idx].base = c.baseHex
	list.value[idx].chain = c.offsetHexes.map(v => makeChain(v))

	highlightIndex.value = idx
	setTimeout(() => {
		highlightIndex.value = -1
	}, 1500)

	await scrollToIndex(idx)

	clearOffsets()
	clearAllAddrCache()

	try {
		const offsets = {}
		for (const item of list.value) {
			const base = parseInt(item.base, 16)
			const chain = item.chain.map(c => parseInt(c.val, 16)).filter(n => !isNaN(n))
			if (isNaN(base)) continue
			offsets[item.key] = [base, chain]
		}
		if (saveOffsets(offsets)) {
			console.log('[applyChainToTarget] 自动保存成功')
		}
	} catch (e) {
		console.warn('[applyChainToTarget] 自动保存失败', e)
	}
}
</script>

<style scoped>
.page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
	padding: 4px;
	background: transparent;
	font-size: 12px;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 4px;
	background: rgba(255, 255, 255, 0.25);
	border-radius: 10px;
	margin-bottom: 6px;
}

.toolbar .title {
	color: #1e2a2e;
	font-weight: 600;
	font-size: 13px;
}

.toolbar .tools {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
}

.list {
	flex: 1;
	overflow-y: auto;
	scrollbar-width: none;
	min-height: 0;
	overflow-anchor: none;
}

.list::-webkit-scrollbar {
	display: none;
}

.card {
	background: rgba(255, 255, 255, 0.28);
	border: 1px solid rgba(255, 255, 255, 0.4);
	border-radius: 12px;
	padding: 8px;
	margin-bottom: 8px;
	transition: box-shadow 0.3s, border-color 0.3s, background 0.3s;
	transform: translateZ(0);
	-webkit-transform: translateZ(0);
	will-change: transform;
}

.card-active {
	background: rgba(52, 199, 89, 0.25);
	border-color: #34c759;
	box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.5);
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 4px;
}

.key-select {
	flex: 1;
	min-width: 140px;
	max-width: 100%;
	padding: 4px 22px 4px 8px;
	border: 1px solid rgba(255, 255, 255, 0.5);
	border-radius: 8px;
	font-size: 12px;
	font-weight: 500;
	color: #1e2a2e;
	background-color: rgba(255, 255, 255, 0.5);
	height: 26px;
	box-sizing: border-box;
	outline: none;
	-webkit-appearance: none;
	appearance: none;
	background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23444' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 6px center;
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
}

.key-select:focus {
	border-color: #FFD966;
}

.row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 6px;
	height: 30px;
}

.row-label {
	width: 70px;
	color: #1e2a2e;
	font-weight: 500;
	font-size: 12px;
	height: 100%;
	line-height: 20px;
	display: flex;
	align-items: center;
}

.row-input {
	flex: 1;
	padding-left: 4px;
	background: rgba(255, 255, 255, 0.7);
	border-radius: 6px;
	font-size: 11px;
	color: #333;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
	line-height: 20px;
}

.chain-block {
	margin-bottom: 6px;
}

.chain-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 4px;
}

.mini-btn.add-chain.is-disabled {
	background: #c7c7cc;
	color: #fff;
	opacity: 0.7;
}

.mini-btn.add-chain:disabled {
	background: #c7c7cc;
	color: #fff;
	opacity: 0.7;
}

.chain-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.chain-item {
	display: flex;
	align-items: center;
	gap: 6px;
	height: 30px;
}

.chain-input {
	flex: 1;
	background: rgba(255, 255, 255, 0.7);
	padding-left: 4px;
	border-radius: 6px;
	font-size: 11px;
	color: #1e2a2e;
	height: 100%;
	min-height: 0;
	box-sizing: border-box;
}

.chain-idx {
	width: 30px;
	height: 100%;
	color: #ff3b30;
	font-size: 11px;
	font-family: monospace;
	display: flex;
	align-items: center;
}

.preview {
	display: flex;
	align-items: center;
	gap: 6px;
	background: rgba(0, 0, 0, 0.06);
	border-radius: 6px;
	margin-top: 4px;
}

.preview-label {
	color: #1e2a2e;
	font-size: 11px;
}

.preview-code {
	color: #fff;
	font-family: monospace;
	font-size: 11px;
	word-break: break-all;
}

.empty {
	text-align: center;
	padding: 40px 0;
	color: #888;
	font-size: 12px;
}

.mini-btn {
	padding: 8px 16px;
	border: none;
	border-radius: 12px;
	font-size: 11px;
	cursor: pointer;
	line-height: 1;
}

.mini-btn::after {
	border: none;
}

.mini-btn.add {
	background: #34c759;
	color: #fff;
}

.mini-btn.del {
	background: #ff3b30;
	color: #fff;
	margin: 0 0 0 4px;
}

.mini-btn.paste {
	background: #007aff;
	color: #fff;
	margin: 0 0 0 4px;
}

.mini-btn.reset {
	background: #8e8e93;
	color: #fff;
}

.mini-btn.copy {
	background: #5856d6;
	color: #fff;
}

.mini-btn.import {
	background: #ff9500;
	color: #fff;
}

.mini-btn.add-chain {
	background: #007aff;
	color: #fff;
}

.mini-btn.del-chain {
	background: #ff3b30;
	color: #fff;
}

.footer {
	padding-top: 6px;
}

.save-btn {
	width: 100%;
	padding: 10px;
	background: #FFD966;
	border: none;
	border-radius: 12px;
	color: #4a3b1f;
	font-weight: 600;
	font-size: 14px;
}

.save-btn::after {
	border: none;
}

.save-btn:active {
	background: #FFE28A;
}

/* ===== 弹窗样式 ===== */
.modal-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	height: 100vh;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	z-index: 9999;
}

.modal-box {
	width: 90%;
	background: #f2f2f7;
	border-radius: 14px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	padding: 6px;
	box-sizing: border-box;
}

.modal-title {
	font-size: 14px;
	font-weight: 600;
	color: #1e2a2e;
	padding: 0;
	text-align: center;
}

.modal-list {
	flex: 1;
	min-height: 0;
	border-radius: 10px;
}

.modal-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px;
	border-radius: 8px;
	font-size: 13px;
	color: #1e2a2e;
}

.modal-item.active {
	background: #FFD966;
	font-weight: 600;
}

.modal-item-code {
	color: #888;
	font-size: 11px;
	margin-left: 6px;
}

.modal-footer {
	display: flex;
	align-items: center;
}

.paste-box {
	width: 88%;
	max-width: 600px;
	padding: 6px;
	gap: 10px;
}

.paste-hint {
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 6px 8px;
	background: rgba(0, 0, 0, 0.05);
	border-radius: 8px;
	font-size: 10px;
	color: #555;
}

.paste-hint-code {
	font-family: monospace;
	color: #007aff;
	word-break: break-all;
}

.paste-textarea {
	width: 100%;
	min-height: 80px;
	max-height: 160px;
	padding: 8px;
	box-sizing: border-box;
	background: rgba(255, 255, 255, 0.8);
	border: 1px solid rgba(0, 0, 0, 0.1);
	border-radius: 8px;
	font-size: 12px;
	font-family: monospace;
	color: #1e2a2e;
}

.paste-footer {
	display: flex;
	justify-content: flex-end;
	gap: 4px;
}
</style>