// common/tapOnly.js
// 只允许单击：滑动/长按不触发点击
// 在 H5GG 环境下，手动派发 click，绕开原生 click 合成被拦截的问题

export function installTapOnly(options = {}) {
	if (typeof document === 'undefined') return () => {}

	const {
		moveThreshold = 10,       // 移动超过这个像素算滑动
		maxDuration = 500,        // 超过这个时间不算点击（长按）
		allowSelector = 'input, textarea, [contenteditable="true"], [data-tap-allow]'
	} = options

	// 是否是需要放行的元素（输入框等，不参与 tap 合成）
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

	const onTouchStart = (e) => {
		const t = e.touches && e.touches[0]
		if (!t) return

		startTarget = e.target
		startX = t.clientX
		startY = t.clientY
		startTime = Date.now()
		moved = false

		// 输入框等区域不参与 tap 合成
		started = !isAllowed(e.target)
	}

	const onTouchMove = (e) => {
		if (!started) return
		const t = e.touches && e.touches[0]
		if (!t) return

		const dx = Math.abs(t.clientX - startX)
		const dy = Math.abs(t.clientY - startY)
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

		// 长按 → 不触发点击（不 stopPropagation，避免影响滚动容器）
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
	}

	document.addEventListener('touchstart', onTouchStart, {
		passive: true,
		capture: true
	})
	document.addEventListener('touchmove', onTouchMove, {
		passive: true,
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