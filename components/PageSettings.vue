<template>
	<view class="page">
		<!-- 顶部操作栏 -->
		<view class="toolbar">
			<text class="title">指针链配置</text>
			<view class="tools">
				<button class="mini-btn add" @click="addRow">+ 新增</button>
				<button class="mini-btn reset" @click="onReset">恢复默认</button>
				<button class="mini-btn copy" @click="onCopy">复制JS</button>
			</view>
		</view>

		<!-- 配置列表 -->
		<scroll-view class="list" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true" @scroll="onScroll"
			:style="{ height: listHeight + 'px' }">
			<view ref="listContentRef" class="list-content">
				<view v-for="(item, idx) in list" :key="idx" class="card">
					<!-- 第一行：功能 key 选择 + 删除 -->
					<view class="card-header">
						<picker :range="functionKeys" range-key="label" :value="getKeyIndex(item.key)"
							@change="e => onKeyChange(idx, e)">
							<view class="key-picker">
								<text class="key-label">{{ getKeyLabel(item.key) }}</text>
								<text class="key-code">({{ item.key || '未选择' }})</text>
							</view>
						</picker>
						<button class="mini-btn del" @click="removeRow(idx)">删除</button>
					</view>

					<!-- 第二行：基址偏移 -->
					<view class="row">
						<text class="row-label">基址偏移</text>
						<input class="row-input" v-model="item.base" placeholder="0x54A3B48" />
					</view>

					<!-- 第三行：多级偏移链 -->
					<view class="chain-block">
						<view class="chain-header">
							<text class="row-label">偏移链</text>
							<button class="mini-btn add-chain" @click="addChain(idx)">+ 加一级</button>
						</view>
						<view class="chain-list">
							<view v-for="(c, ci) in item.chain" :key="ci" class="chain-item">
								<text class="chain-idx">[{{ ci }}]</text>
								<input class="chain-input" v-model="item.chain[ci]" placeholder="0xC48" />
								<button v-if="item.chain.length > 1" class="mini-btn del-chain"
									@click="removeChain(idx, ci)">×</button>
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
			<button class="save-btn" @click="onSave">保存配置</button>
		</view>
	</view>
</template>

<script setup>
	import {
		ref,
		onMounted,
		onUnmounted,
		nextTick
	} from 'vue'
	import {
		loadOffsets,
		saveOffsets,
		resetOffsets,
		exportAsJS,
		getKeyOptions
	} from '@/common/offsetsStore.js'
	import {
		getLabel
	} from '@/common/functionLabels.js'
	import {
		clearOffsets,
		clearAllAddrCache
	} from '@/common/h5gg.js'

	const listHeight = ref(300)
	const scrollTop = ref(0)
	const listContentRef = ref(null)

	// 用户当前滚动位置（不从 scrollTop.value 读，避免和受控值冲突）
	let currentScrollTop = 0

	// 是否处于"自动滚动到顶/底"的过程中（防止 onScroll 覆盖）
	let isAutoScrolling = false

	// 内容高度（MutationObserver 实时更新）
	let contentHeight = 0

	// 可视区高度（scroll-view 自身高度）
	let viewportHeight = 0

	// MutationObserver 实例
	let observer = null

	// ===== 监听用户滚动 =====
	function onScroll(e) {
		currentScrollTop = e.detail.scrollTop
		// 如果不在自动滚动状态，把 scrollTop 同步成实际值
		// 这样下次设 scrollTop 时，值一定会变化
		if (!isAutoScrolling) {
			// 用 setTimeout 0，避免在滚动事件里直接改导致抖动
			if (scrollTop.value !== currentScrollTop) {
				scrollTop.value = currentScrollTop
			}
		}
	}

	// ===== 测量内容高度 =====
	function measureContent() {
		if (!listContentRef.value) return
		const el = listContentRef.value.$el || listContentRef.value
		if (el && typeof el.getBoundingClientRect === 'function') {
			const rect = el.getBoundingClientRect()
			contentHeight = Math.ceil(rect.height)
		}
	}

	// ===== 测量可视区高度 =====
	function measureViewport() {
		const query = uni.createSelectorQuery()
		query.select('.list').boundingClientRect(rect => {
			if (rect && rect.height) {
				viewportHeight = Math.ceil(rect.height)
			}
		}).exec()
	}

	// ===== 滚动到底部 =====
	async function scrollToBottom() {
		await nextTick()
		// 等 DOM 真正渲染完，再测量
		await new Promise(resolve => setTimeout(resolve, 30))

		measureContent()
		measureViewport()

		if (contentHeight <= viewportHeight) {
			// 内容没超过可视区，不需要滚动
			return
		}

		const maxScrollTop = contentHeight - viewportHeight
		if (maxScrollTop <= 0) return

		// 如果已经在底部附近，不重复触发
		if (Math.abs(currentScrollTop - maxScrollTop) < 2) return

		isAutoScrolling = true

		// 先设 0（如果当前不是 0），再设目标值，确保值变化
		if (scrollTop.value !== 0 && currentScrollTop === 0) {
			// 特殊情况：当前就在 0，直接设目标
			scrollTop.value = maxScrollTop
		} else {
			// 先重置到当前实际位置，再设目标
			scrollTop.value = currentScrollTop
			await nextTick()
			scrollTop.value = maxScrollTop
		}

		// 自动滚动动画结束后，解除标记
		setTimeout(() => {
			isAutoScrolling = false
			// 同步一次实际值，为下次做准备
			currentScrollTop = maxScrollTop
			scrollTop.value = maxScrollTop
		}, 350) // 300ms 动画 + 50ms 缓冲
	}

	// ===== 初始化 MutationObserver =====
	function setupObserver() {
		if (typeof MutationObserver === 'undefined') return
		if (!listContentRef.value) return

		const el = listContentRef.value.$el || listContentRef.value
		if (!el) return

		observer = new MutationObserver((mutations) => {
			// 内容变化，重新测量
			measureContent()
		})

		observer.observe(el, {
			childList: true, // 子节点增删
			subtree: true, // 监听所有后代
			attributes: false, // 不监听属性，减少开销
			characterData: false
		})
	}

	const functionKeys = getKeyOptions()

	// ===== 列表数据 =====
	const list = ref([])

	// ===== 加载已有配置到列表 =====
	function loadToList() {
		const offsets = loadOffsets()
		const arr = []
		for (const key in offsets) {
			const [base, chain] = offsets[key]
			arr.push({
				key,
				base: '0x' + Number(base).toString(16).toUpperCase(),
				chain: chain.map(n => '0x' + Number(n).toString(16).toUpperCase())
			})
		}
		list.value = arr
	}

	onMounted(async () => {
		loadToList()

		// 计算 scroll-view 高度
		const query = uni.createSelectorQuery()
		query.select('.page').boundingClientRect(rect => {
			if (rect) {
				listHeight.value = Math.max(100, rect.height - 80)
			}
		}).exec()

		await nextTick()
		await new Promise(resolve => setTimeout(resolve, 50))

		// 测量初始尺寸
		measureContent()
		measureViewport()

		// 启动 MutationObserver
		setupObserver()
	})

	onUnmounted(() => {
		if (observer) {
			observer.disconnect()
			observer = null
		}
	})

	// ===== key 索引 =====
	function getKeyIndex(key) {
		const i = functionKeys.findIndex(f => f.key === key)
		return i >= 0 ? i : 0
	}

	function getKeyLabel(key) {
		return getLabel(key)
	}

	// ===== 增删改 =====
	async function addRow() {
		list.value.push({
			key: functionKeys[0].key,
			base: '0x0',
			chain: ['0x0']
		})
		// 新增后滚到底部
		await scrollToBottom()
	}

	function removeRow(idx) {
		list.value.splice(idx, 1)
	}

	function onKeyChange(idx, e) {
		const i = e.detail.value
		list.value[idx].key = functionKeys[i].key
	}

	async function addChain(idx) {
		list.value[idx].chain.push('0x0')
		// 加一级后也滚到底部（可选）
		await scrollToBottom()
	}

	function removeChain(idx, ci) {
		list.value[idx].chain.splice(ci, 1)
	}

	// ===== 预览格式化 =====
	function formatPreview(item) {
		const chainStr = item.chain.join(', ')
		return `[${item.base}, [${chainStr}]]`
	}

	// ===== 保存 =====
	function onSave() {
		const seen = new Set()
		for (let i = 0; i < list.value.length; i++) {
			const item = list.value[i]
			if (!item.key) {
				uni.showToast({
					title: `第 ${i + 1} 项未选择功能`,
					icon: 'none'
				})
				return
			}
			if (seen.has(item.key)) {
				uni.showToast({
					title: `功能 ${item.key} 重复`,
					icon: 'none'
				})
				return
			}
			seen.add(item.key)
		}

		const offsets = {}
		for (const item of list.value) {
			const base = parseInt(item.base, 16)
			const chain = item.chain.map(s => parseInt(s, 16)).filter(n => !isNaN(n))
			if (isNaN(base)) {
				uni.showToast({
					title: `基址 ${item.base} 无效`,
					icon: 'none'
				})
				return
			}
			offsets[item.key] = [base, chain]
		}

		if (saveOffsets(offsets)) {
			clearOffsets()
			clearAllAddrCache()
			uni.showToast({
				title: '保存成功',
				icon: 'success'
			})
		} else {
			uni.showToast({
				title: '保存失败',
				icon: 'none'
			})
		}
	}

	// ===== 恢复默认 =====
	function onReset() {
		uni.showModal({
			title: '恢复默认',
			content: '确定要恢复默认配置吗？当前配置会被覆盖。',
			success: (res) => {
				if (res.confirm) {
					resetOffsets()
					loadToList()
					uni.showToast({
						title: '已恢复默认',
						icon: 'success'
					})
				}
			}
		})
	}

	// ===== 复制为 JS 代码 =====
	function onCopy() {
		const offsets = loadOffsets()
		const jsCode = exportAsJS(offsets)
		uni.setClipboardData({
			data: jsCode,
			success: () => {
				uni.showToast({
					title: '已复制到剪贴板',
					icon: 'success'
				})
			}
		})
	}
</script>

<style scoped>
	.page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
		/* ★ 关键 */
		padding: 4px;
		background: transparent;
		font-size: 12px;
	}

	/* 顶部操作栏 */
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
	}

	/* 列表 */
	.list {
		flex: 1;
		overflow-y: auto;
		scrollbar-width: none;
		min-height: 0;
		/* ★ 关键 */
	}

	.list::-webkit-scrollbar {
		display: none;
	}

	/* 卡片 */
	.card {
		background: rgba(255, 255, 255, 0.28);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 12px;
		padding: 8px;
		margin-bottom: 8px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 6px;
	}

	.key-picker {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 8px;
		min-width: 140px;
	}

	.key-label {
		color: #1e2a2e;
		font-weight: 500;
	}

	.key-code {
		color: #666;
		font-size: 11px;
	}

	/* 行 */
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
		height: 20px;
	}

	.row-label {
		width: 70px;
		color: #1e2a2e;
		font-weight: 500;
		font-size: 12px;
		height: 100%;
		line-height: 20px;
		/* ★ 文字垂直居中 */
		display: flex;
		/* ★ 或用 flex 居中 */
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
		/* ★ 关键：去掉默认最小高度 */
		box-sizing: border-box;
		/* ★ 关键：padding 算进高度 */
		line-height: 20px;
		/* ★ 文字垂直居中 */
	}

	/* 偏移链 */
	.chain-block {
		margin-bottom: 6px;
	}

	.chain-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.chain-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.chain-item {
		display: flex;
		align-items: center;
		/* ★ 改回 center，子元素垂直居中 */
		gap: 6px;
		height: 20px;
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
		/* ★ 关键 */
		box-sizing: border-box;
		/* ★ 关键 */
		line-height: 20px;
		/* ★ 文字垂直居中 */
	}

	.chain-idx {
		width: 30px;
		height: 100%;
		color: #ff3b30;
		font-size: 11px;
		font-family: monospace;
		line-height: 20px;
		/* ★ 文字垂直居中 */
		display: flex;
		align-items: center;
	}

	/* 预览 */
	.preview {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
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

	/* 空状态 */
	.empty {
		text-align: center;
		padding: 40px 0;
		color: #888;
		font-size: 12px;
	}

	/* 按钮 */
	.mini-btn {
		padding: 4px 10px;
		border: none;
		border-radius: 12px;
		font-size: 11px;
		cursor: pointer;
		line-height: 1.2;
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
		margin: 0;
	}

	.mini-btn.reset {
		background: #8e8e93;
		color: #fff;
	}

	.mini-btn.copy {
		background: #5856d6;
		color: #fff;
	}

	.mini-btn.add-chain {
		background: #007aff;
		color: #fff;
		padding: 2px 8px;
	}

	.mini-btn.del-chain {
		background: #ff3b30;
		color: #fff;
		padding: 2px 8px;
	}

	/* 底部 */
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
</style>