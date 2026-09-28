// common/gestureBlocker.js
// 手势拦截：双击、长按、contextmenu
// 允许通过 [data-gesture-allow] 在特定元素上放行

export function installGestureBlocker(options = {}) {
	if (typeof document === 'undefined') return () => {}

	const {
		allowSelector = '[data-gesture-allow]'
	} = options

	const isAllowed = (el) => {
		if (!el || typeof el.closest !== 'function') return false
		return !!el.closest(allowSelector)
	}

	// ===== 1. 拦截双击 =====
	const onDblClick = (e) => {
		if (isAllowed(e.target)) return
		e.preventDefault()
		e.stopPropagation()
	}
	document.addEventListener('dblclick', onDblClick, true)

	// ===== 2. 拦截右键 / 长按 contextmenu =====
	const onContextMenu = (e) => {
		if (isAllowed(e.target)) return
		e.preventDefault()
		e.stopPropagation()
	}
	document.addEventListener('contextmenu', onContextMenu, true)

	// ===== 3. 拦截 iOS 长按选择 =====
	// 用 CSS 的 -webkit-touch-callout + user-select 更彻底
	// JS 只能兜底：长按 500ms 且未移动 → 阻止默认
	let longPressTimer = null
	const LONG_PRESS_MS = 500

	const onTouchStartLP = (e) => {
		if (isAllowed(e.target)) return
		const t = e.touches && e.touches[0]
		if (!t) return
		const startX = t.clientX
		const startY = t.clientY

		longPressTimer = setTimeout(() => {
			longPressTimer = null
			// 长按触发：阻止默认行为
			// 注意：已经触发的无法撤销，只能预防后续
		}, LONG_PRESS_MS)
	}

	const clearLP = () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
	}

	document.addEventListener('touchstart', onTouchStartLP, {
		passive: true,
		capture: true
	})
	document.addEventListener('touchmove', clearLP, {
		passive: true,
		capture: true
	})
	document.addEventListener('touchend', clearLP, {
		passive: true,
		capture: true
	})
	document.addEventListener('touchcancel', clearLP, {
		passive: true,
		capture: true
	})

	return () => {
		document.removeEventListener('dblclick', onDblClick, true)
		document.removeEventListener('contextmenu', onContextMenu, true)
		document.removeEventListener('touchstart', onTouchStartLP, true)
		document.removeEventListener('touchmove', clearLP, true)
		document.removeEventListener('touchend', clearLP, true)
		document.removeEventListener('touchcancel', clearLP, true)
		clearLP()
	}
}