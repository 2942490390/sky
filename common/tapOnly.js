// common/tapOnly.js
// 只允许单击：滑动/长按不触发点击
// 允许通过 selector 在特定元素上放行（输入框等）

export function installTapOnly(options = {}) {
	if (typeof document === 'undefined') return () => {}

	const {
		moveThreshold = 10, // 移动超过这个像素算滑动
			maxDuration = 500, // 超过这个时间不算点击（长按）
			allowSelector = 'input, textarea, [contenteditable="true"], [data-tap-allow]'
	} = options

	const isAllowed = (el) => {
		if (!el || typeof el.closest !== 'function') return false
		return !!el.closest(allowSelector)
	}

	let startX = 0
	let startY = 0
	let startTime = 0
	let moved = false
	let started = false

	const onTouchStart = (e) => {
		if (isAllowed(e.target)) {
			started = false
			return
		}
		const t = e.touches && e.touches[0]
		if (!t) return
		startX = t.clientX
		startY = t.clientY
		startTime = Date.now()
		moved = false
		started = true
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
		if (moved) return // 滑动 → 不算点击

		const duration = Date.now() - startTime
		if (duration > maxDuration) {
			// 长按 → 阻止
			e.preventDefault()
			e.stopPropagation()
			return
		}
		// 正常单击 → 放行
	}

	const onTouchCancel = () => {
		started = false
		moved = false
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
		passive: false,
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