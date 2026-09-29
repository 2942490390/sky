// common/tapOnly.js
// 只允许单击：滑动/长按不触发点击
// 在 H5GG / iOS Safari 环境下：
//   1. 手动派发 click，绕开原生 click 合成被拦截的问题
//   2. 在 capture 阶段 preventDefault，掐掉 iOS 长按放大镜与文字选择

export function installTapOnly(options = {}) {
	if (typeof document === 'undefined') return () => { }

	const {
		moveThreshold = 10,       // 移动超过这个像素算滑动
		maxDuration = 500,        // 超过这个时间不算点击（长按）
		allowSelector = 'input, textarea, select, option, [contenteditable="true"], [data-tap-allow]'
	} = options

	// 需要放行的元素（输入框等）：不参与 tap 合成，也不 preventDefault
	const isAllowed = (el) => {
		if (!el || typeof el.closest !== 'function') return false
		return !!el.closest(allowSelector)
	}

	let startX = 0
	let startY = 0
	let startTime = 0
	let moved = false
	let started = false
	let startTarget = null
	let moveDirection = null   // ★ 新增：'horizontal' | 'vertical' | null

	const onTouchStart = (e) => {
		const t = e.touches && e.touches[0]
		if (!t) return

		// ★ 放行元素：完全跳过，交给系统原生处理
		if (isAllowed(e.target)) {
			started = false
			startTarget = null
			return
		}

		startTarget = e.target
		startX = t.clientX
		startY = t.clientY
		startTime = Date.now()
		moved = false
		started = true
		moveDirection = null
	}

	const onTouchMove = (e) => {
		if (!started) return
		const t = e.touches && e.touches[0]
		if (!t) return

		const dx = Math.abs(t.clientX - startX)
		const dy = Math.abs(t.clientY - startY)

		// 判定一次方向后固定，避免抖动
		if (!moveDirection && (dx > 5 || dy > 5)) {
			moveDirection = dx > dy ? 'horizontal' : 'vertical'
		}

		// ★ 只拦截横向滑动，竖向放行让页面滚动
		if (moveDirection === 'horizontal' && e.cancelable) {
			e.preventDefault()
		}

		// 原有逻辑：超过阈值算滑动，不触发点击
		if (dx > moveThreshold || dy > moveThreshold) moved = true
	}

	const onTouchEnd = (e) => {
		if (!started) return
		started = false

		// 滑动 → 不触发点击
		if (moved) {
			startTarget = null
			return
		}

		// 长按 → 不触发点击
		const duration = Date.now() - startTime
		if (duration > maxDuration) {
			startTarget = null
			return
		}

		// 正常单击 → 手动派发 click
		const target = startTarget
		startTarget = null

		if (!target || !target.isConnected) return

		// 用 MouseEvent 派发 click，Vue 的 @click / @tap 都能接住
		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			view: window,
			detail: 1
		})
		target.dispatchEvent(clickEvent)
	}

	const onTouchCancel = () => {
		started = false
		moved = false
		startTarget = null
		moveDirection = null
	}

	document.addEventListener('touchstart', onTouchStart, {
		passive: true,      // ★ 从 false 改回 true
		capture: true
	})
	document.addEventListener('touchmove', onTouchMove, {
		passive: false,     // ★ 保持 false，因为里面仍可能 preventDefault
		capture: true
	})
	document.addEventListener('touchend', onTouchEnd, {
		passive: true,
		capture: true
	})
	document.addEventListener('touchcancel', onTouchCancel, {
		passive: true,
		capture: true
	})

	return () => {
		document.removeEventListener('touchstart', onTouchStart, true)
		document.removeEventListener('touchmove', onTouchMove, true)
		document.removeEventListener('touchend', onTouchEnd, true)
		document.removeEventListener('touchcancel', onTouchCancel, true)
	}
}