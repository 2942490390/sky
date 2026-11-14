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

const {
	reload
} = useReload()

// ★ 2. 提为模块级变量，确保 add/remove 引用同一函数
let vvHandler = null
let onFocusOut = null
let onFocusIn = null // 聚焦处理器
let onWindowScroll = null // 窗口滚动锁
let lockedScrollY = 0 // 锁定的滚动位置

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

		isScrollLocked = false

		if (focusOutTimer) clearTimeout(focusOutTimer)
		focusOutTimer = setTimeout(() => {
			// 1. 重置页面滚动
			window.scrollTo(0, 0)
			if (document.documentElement) document.documentElement.scrollTop = 0
			if (document.body) document.body.scrollTop = 0

			// 2. 触发 resize
			window.dispatchEvent(new Event('resize'))
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
	<slot />
</template>

<style>
@import './App.css';
@import url('https://cdn.bootcdn.net/ajax/libs/font-awesome/7.2.0/css/all.min.css');
</style>