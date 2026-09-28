<script setup>
	import {
		onMounted,
		onUnmounted,
		ref,
		nextTick
	} from 'vue'
	import {
		initWindowLayout
	} from '@/common/windowLayout.js'
	import {
		startVersionCheck,
		stopVersionCheck
	} from '@/common/versionCheck.js'
	import {
		startResponsiveCheck,
		stopResponsiveCheck,
		forceReloadPage
	} from '@/common/responsiveChecker.js'
	import {
		useReload
	} from '@/common/useReload.js'
	import {
		installInteractionWatchdog
	} from '@/common/interactionWatchdog.js'
	import {
		installGestureBlocker
	} from '@/common/gestureBlocker.js'
	import {
		installTapOnly
	} from '@/common/tapOnly.js'



	// ★ 1. 面板可见性由 Vue 响应式控制
	const panelVisible = ref(true)

	const {
		reload
	} = useReload()

	// ★ 2. 提为模块级变量，确保 add/remove 引用同一函数
	let vvHandler = null
	let onFocusOut = null
	let onFocusIn = null // ★ 新增：聚焦处理器
	let onWindowScroll = null // ★ 新增：窗口滚动锁
	let lockedScrollY = 0 // ★ 新增：锁定的滚动位置

	// ★ 3. 记录所有内部定时器
	let focusOutTimer = null
	let vvTimer = null
	let reloadTimer = null
	let stopInteractionWatchdog = null
	let stopGestureBlocker = null // ★ 新增
	let stopTapOnly = null // ★ 新增

	// ★ 4. 滚动锁定标志
	let isScrollLocked = false

	// ★ 增加修复锁，防止重复触发导致时序混乱
	let isRepairing = false

	async function repairInteractionLayer(reason, detail) {
		if (isRepairing) return
		isRepairing = true

		console.warn('[interaction] 自动修复按钮命中层:', reason, detail)
		uni.showToast({
			title: '正在修复交互层...',
			icon: 'none',
			duration: 1500
		})

		// 给 toast 一点时间显示，然后整页重载
		setTimeout(() => {
			try {
				if (typeof location !== 'undefined' && typeof location.reload === 'function') {
					location.reload()
				}
			} catch (e) {
				console.error('[interaction] 刷新失败:', e)
				isRepairing = false
			}
		}, 800)
	}

	onMounted(() => {
		initWindowLayout((rect) => {
			if (!rect) return
			if (typeof document !== 'undefined') {
				document.documentElement.style.setProperty('--panel-w', rect.w + 'px')
				document.documentElement.style.setProperty('--panel-h', rect.h + 'px')
			}
		})

		// #ifdef H5
		startVersionCheck({
			url: '',
			interval: 60 * 1000
		})

		startResponsiveCheck((type, detail) => {
			console.warn('页面无响应:', type, detail)

			try {
				reload()
			} catch (e) {
				console.error('reload 失败', e)
			}

			let recovered = false
			let checkCount = 0
			const maxCheck = 10

			function checkRecovery() {
				if (recovered || checkCount >= maxCheck) {
					if (!recovered) {
						console.warn('[responsive] 10 次检测未恢复，强制刷新')
						forceReloadPage()
					}
					return
				}

				checkCount++
				requestAnimationFrame(() => {
					recovered = true
					console.log('[responsive] 主线程已恢复')
				})

				setTimeout(checkRecovery, 1000)
			}

			checkRecovery()
		})
		// #endif

		if (typeof document === 'undefined') return

		// 1. 交互层看门狗：诊断 hit-test 偏移
		try {
			stopInteractionWatchdog = installInteractionWatchdog(repairInteractionLayer)
		} catch (err) {
			console.error('[App] installInteractionWatchdog 失败:', err)
			stopInteractionWatchdog = null
		}

		// 2. 手势拦截：双击、长按、contextmenu
		try {
			stopGestureBlocker = installGestureBlocker({
				allowSelector: '[data-gesture-allow]'
			})
		} catch (err) {
			console.error('[App] installGestureBlocker 失败:', err)
			stopGestureBlocker = null
		}

		// 3. 只允许单击：滑动/长按不触发点击
		try {
			stopTapOnly = installTapOnly({
				moveThreshold: 10,
				maxDuration: 500,
				allowSelector: 'input, textarea, [contenteditable="true"], [data-tap-allow]'
			})
		} catch (err) {
			console.error('[App] installTapOnly 失败:', err)
			stopTapOnly = null
		}

		// ============================================================
		// ★ 核心修复：聚焦时锁定页面滚动，防止浏览器 scrollIntoView
		// ============================================================
		onFocusIn = (e) => {
			const tag = e.target && e.target.tagName
			if (tag !== 'INPUT' && tag !== 'TEXTAREA') return

			// 记录当前滚动位置
			lockedScrollY = window.scrollY ||
				document.documentElement.scrollTop ||
				document.body.scrollTop || 0

			isScrollLocked = true

			// 浏览器 scrollIntoView 是异步的，用双 rAF 抢在它之后恢复
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					if (isScrollLocked) {
						window.scrollTo(0, lockedScrollY)
						if (document.documentElement) {
							document.documentElement.scrollTop = lockedScrollY
						}
						if (document.body) {
							document.body.scrollTop = lockedScrollY
						}
					}
				})
			})
		}
		document.addEventListener('focusin', onFocusIn, true)

		// ★ 监听窗口滚动，聚焦期间强制拉回
		onWindowScroll = () => {
			if (!isScrollLocked) return
			const cur = window.scrollY ||
				document.documentElement.scrollTop ||
				document.body.scrollTop || 0
			if (Math.abs(cur - lockedScrollY) > 1) {
				window.scrollTo(0, lockedScrollY)
				if (document.documentElement) {
					document.documentElement.scrollTop = lockedScrollY
				}
				if (document.body) {
					document.body.scrollTop = lockedScrollY
				}
			}
		}
		window.addEventListener('scroll', onWindowScroll, {
			passive: true
		})

		// ============================================================
		// ★ 失焦处理：解锁滚动 + 强制重排
		// ============================================================
		onFocusOut = (e) => {
			const tag = e.target && e.target.tagName
			if (tag !== 'INPUT' && tag !== 'TEXTAREA') return

			// 解锁滚动
			isScrollLocked = false

			if (focusOutTimer) clearTimeout(focusOutTimer)
			focusOutTimer = setTimeout(async () => {
				// 1. 重置页面滚动
				window.scrollTo(0, 0)
				if (document.documentElement) document.documentElement.scrollTop = 0
				if (document.body) document.body.scrollTop = 0

				// 2. 触发 resize
				window.dispatchEvent(new Event('resize'))

				// 3. 通过 Vue 响应式触发重排
				panelVisible.value = false
				await nextTick()
				panelVisible.value = true
			}, 100)
		}

		document.addEventListener('focusout', onFocusOut, true)

		// ============================================================
		// ★ visualViewport 监听（更精确）
		// ============================================================
		if (window.visualViewport) {
			vvHandler = () => {
				const vv = window.visualViewport
				const keyboardHeight = window.innerHeight - vv.height

				// 键盘弹出时，继续保持锁定
				if (keyboardHeight >= 50 && isScrollLocked) {
					window.scrollTo(0, lockedScrollY)
					return
				}

				// 键盘收起
				if (keyboardHeight < 50) {
					if (vvTimer) clearTimeout(vvTimer)
					vvTimer = setTimeout(() => {
						window.scrollTo(0, 0)
						window.dispatchEvent(new Event('resize'))
					}, 100)
				}
			}
			window.visualViewport.addEventListener('resize', vvHandler)
		}
	})

	onUnmounted(() => {
		if (stopInteractionWatchdog) {
			stopInteractionWatchdog()
			stopInteractionWatchdog = null
		}
		if (stopGestureBlocker) {
			stopGestureBlocker()
			stopGestureBlocker = null
		}
		if (stopTapOnly) {
			stopTapOnly()
			stopTapOnly = null
		}

		if (onFocusIn) {
			document.removeEventListener('focusin', onFocusIn, true)
			onFocusIn = null
		}

		if (onFocusOut) {
			document.removeEventListener('focusout', onFocusOut, true)
			onFocusOut = null
		}

		if (onWindowScroll) {
			window.removeEventListener('scroll', onWindowScroll, {
				passive: true
			})
			onWindowScroll = null
		}

		if (window.visualViewport && vvHandler) {
			window.visualViewport.removeEventListener('resize', vvHandler)
			vvHandler = null
		}

		if (focusOutTimer) {
			clearTimeout(focusOutTimer)
			focusOutTimer = null
		}
		if (vvTimer) {
			clearTimeout(vvTimer)
			vvTimer = null
		}
		if (reloadTimer) {
			clearTimeout(reloadTimer)
			reloadTimer = null
		}
		if (stopInteractionWatchdog) {
			stopInteractionWatchdog()
			stopInteractionWatchdog = null
		}

		// #ifdef H5
		stopVersionCheck()
		stopResponsiveCheck()
		// #endif
	})
</script>

<template>
	<div v-show="panelVisible">
		<slot />
	</div>
</template>

<style>
	@import url('https://cdn.bootcdn.net/ajax/libs/font-awesome/7.2.0/css/all.min.css');

	html,
	body {
		/* ★ 禁止双击缩放，保留单击和滑动 */
		touch-action: manipulation;
	}

	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
		font-family: -apple-system, system-ui, sans-serif;
		-webkit-tap-highlight-color: transparent;
	}

	/* 输入框例外：允许选择、允许 callout */
	input,
	textarea,
	[contenteditable="true"] {
		-webkit-user-select: text;
		user-select: text;
		-webkit-touch-callout: default;
		touch-action: auto;
	}

	/* 需要允许双击/长按的元素 */
	[data-gesture-allow] {
		touch-action: auto;
		-webkit-user-select: text;
		user-select: text;
		-webkit-touch-callout: default;
	}

	button {
		min-height: 0;
		line-height: 1;
		height: auto;
	}

	.uni-button-reset,
	button::after {
		margin: 0;
		padding: 0;
		border: none !important;
		background: transparent;
		font: inherit;
		color: inherit;
		text-align: inherit;
		line-height: inherit;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
	}

	/* ================== 全局重置 ================== */
	page {
		background: transparent;
		min-height: 100vh;
		/* ★ 关键：不再用 flex 居中，避免键盘弹出时布局被推挤 */
		display: block;
		border: none;
		/* ★ 禁止页面本身滚动 */
		overflow: hidden;
		position: relative;
	}

	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
		font-family: -apple-system, system-ui, sans-serif;
		-webkit-tap-highlight-color: transparent;
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}

	uni-toast,
	.uni-toast__content {
		font-size: 12px;
	}


	/* ================== 玻璃面板 ================== */
	/* 外层：fixed 铺满视口，flex 居中 */
	.glass-panel {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		pointer-events: none;
		/* 空白区域不吃点击 */
	}

	/* 内层：真正面板 */
	.glass-inner {
		pointer-events: auto;
		display: flex;
		flex-direction: row;
		overflow: hidden;
		clip-path: inset(0 round 26px);
		width: var(--panel-w, 596px);
		height: var(--panel-h, 372px);
		padding: 10px;
		background: #1a1a2e;
		box-sizing: border-box;
		position: relative;

		/* ★ 新增：缩放过渡 + 缩放原点居中 */
		transform-origin: center center;
		transition: transform 0.2s ease;
		will-change: transform;
	}

	/* ================== 第一层：底层大曲面 ================== */
	.glass-inner::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 90% 70% at 20% 10%,
				rgba(230, 200, 160, 0.95) 0%,
				rgba(230, 200, 160, 0) 55%),
			radial-gradient(ellipse 80% 90% at 85% 90%,
				rgba(123, 94, 167, 0.9) 0%,
				rgba(123, 94, 167, 0) 60%),
			linear-gradient(160deg,
				#d4b896 0%,
				#c9a0b0 35%,
				#7b5ea7 70%,
				#4a3268 100%);
		z-index: 0;
		pointer-events: none;
	}

	/* ================== 第二层：花瓣折叠光影 ================== */
	.glass-inner::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(ellipse 60% 40% at 30% 25%,
				rgba(255, 245, 220, 0.65) 0%,
				rgba(255, 245, 220, 0) 50%),
			radial-gradient(ellipse 50% 60% at 55% 50%,
				rgba(80, 60, 100, 0.45) 0%,
				rgba(80, 60, 100, 0) 60%),
			radial-gradient(ellipse 70% 50% at 75% 70%,
				rgba(200, 180, 220, 0.5) 0%,
				rgba(200, 180, 220, 0) 55%);
		mix-blend-mode: overlay;
		z-index: 0;
		pointer-events: none;
	}

	.glass-inner>* {
		position: relative;
		z-index: 1;
	}

	html.sky-hit-test-repair .glass-inner {
		clip-path: none !important;
		-webkit-transform: translateZ(0) !important;
		transform: translateZ(0) !important;
		will-change: transform !important;
	}

	html.sky-hit-test-repair .glass-inner * {
		-webkit-backdrop-filter: none !important;
		backdrop-filter: none !important;
	}

	/* ================== 1 分钟色调切换动画 ================== */
	@keyframes toneShift {

		0%,
		100% {
			filter: hue-rotate(0deg) saturate(1);
		}

		50% {
			filter: hue-rotate(200deg) saturate(0.8);
		}
	}

	/* ================== 深色模式 ================== */
	@media (prefers-color-scheme: dark) {
		.glass-inner::before {
			background:
				radial-gradient(ellipse 80% 60% at 30% 20%,
					rgba(168, 200, 232, 0.85) 0%,
					rgba(168, 200, 232, 0) 55%),
				radial-gradient(ellipse 70% 80% at 70% 80%,
					rgba(30, 50, 100, 0.95) 0%,
					rgba(30, 50, 100, 0) 60%),
				linear-gradient(160deg,
					#2a3a6b 0%,
					#1e2749 50%,
					#0a0e1f 100%);
		}

		.glass-inner::after {
			background:
				radial-gradient(ellipse 60% 40% at 30% 25%,
					rgba(180, 210, 240, 0.5) 0%,
					rgba(180, 210, 240, 0) 50%),
				radial-gradient(ellipse 50% 60% at 55% 50%,
					rgba(10, 20, 50, 0.5) 0%,
					rgba(10, 20, 50, 0) 60%),
				radial-gradient(ellipse 70% 50% at 75% 70%,
					rgba(140, 180, 220, 0.4) 0%,
					rgba(140, 180, 220, 0) 55%);
		}
	}

	.panel-title {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		color: white;
		font-weight: 600;
		font-size: 0.5rem;
		pointer-events: auto;
	}

	.panel-subtitle {
		color: white;
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.audio-bar {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 10px;
	}

	.audio-bar-span {
		width: 2px;
		background: #fff;
		border-radius: 1px;
		animation: audioWave 1s infinite ease-in-out;
	}

	.audio-bar-span:nth-child(1) {
		animation-delay: 0s;
		height: 3px;
	}

	.audio-bar-span:nth-child(2) {
		animation-delay: 0.2s;
		height: 5px;
	}

	.audio-bar-span:nth-child(3) {
		animation-delay: 0.4s;
		height: 4px;
	}

	.audio-bar-span:nth-child(4) {
		animation-delay: 0.1s;
		height: 7px;
	}

	@keyframes audioWave {

		0%,
		100% {
			transform: scaleY(1);
		}

		50% {
			transform: scaleY(.4);
		}
	}

	.vertical-divider {
		flex: 0 0 1px;
		background-color: white;
		align-self: stretch;
		margin: 0;
		position: relative;
		left: 4px;
	}

	.right-container {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		padding: 10px;
		position: relative;
		left: auto;
		top: auto;
		right: auto;
		bottom: auto;
		max-height: calc(100vh - 24px);
		-ms-overflow-style: none;
	}

	.right-container::-webkit-scrollbar {
		display: none;
	}

	.page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		gap: 6px;
		overflow-y: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.page::-webkit-scrollbar {
		display: none;
	}

	#mainMapView,
	#subMapView {
		display: flex;
		flex-direction: column;
		gap: 4px;
		height: 100%;
		overflow-y: auto;
	}

	.sky-task {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px;
		background: rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 16px;
		color: #2c2c2c;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.sky-task:hover {
		background: rgba(255, 255, 255, 0.4);
		transform: translateY(-1px);
	}

	.task-left {
		display: flex;
		align-items: center;
		gap: 10px;
		color: #1e2a2e;
		flex: 1;
	}

	.sky-btn {
		/* padding: 6px 18px; */
		background: #FFD966;
		border: none;
		border-radius: 40px;
		color: #4a3b1f;
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		transition: 0.15s ease;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
	}

	.sky-btn:hover {
		background: #FFE28A;
		transform: scale(1.02);
	}

	.sky-btn:active {
		transform: scale(0.98);
	}

	.sky-btn.stop,
	.sky-btn.axis {
		margin: 0 0 0 4px;
	}

	.sky-btn-toggle {
		/* padding: 6px 18px; */
		background: #7C9EB2;
		border: none;
		border-radius: 40px;
		color: white;
		font-weight: 600;
		font-size: 13px;
		cursor: pointer;
		transition: 0.15s ease;
	}

	.sky-btn-toggle:hover {
		background: #8FB0C4;
		transform: scale(1.02);
	}

	.sky-btn-back {
		background: #ADB5BD;
		color: #2c2c2c;
	}

	.sky-btn-back:hover {
		background: #C0C8CF;
	}

	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 46px;
		height: 26px;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-switch .slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.2);
		transition: .2s;
		border-radius: 30px;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.toggle-switch .slider::before {
		position: absolute;
		content: "";
		height: 20px;
		width: 20px;
		left: 3px;
		bottom: 2px;
		background: #FFF9E8;
		transition: .2s;
		border-radius: 50%;
	}

	.toggle-switch input:checked+.slider {
		background: #FFD966;
	}

	.toggle-switch input:checked+.slider::before {
		transform: translateX(20px);
		background: #ffffff;
	}

	.submap-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 16px;
		background: rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 14px;
		margin-left: 16px;
		margin-bottom: 8px;
		font-size: 13px;
		color: #1e2a2e;
	}

	.submap-item:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.submap-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
	}
</style>