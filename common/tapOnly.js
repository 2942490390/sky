// common/tapOnly.js
export function installTapOnly(options = {}) {
	if (typeof document === 'undefined') return () => { }

	const {
		moveThreshold = 10,
		maxDuration = 500,
		allowSelector = 'input, textarea, select, option, [contenteditable="true"], [data-tap-allow]'
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
	let startTarget = null
	let moveDirection = null

	// ★ 用于识别"刚合成的 click"
	let lastSyntheticClickTs = 0

	const onTouchStart = (e) => {
		const t = e.touches && e.touches[0]
		if (!t) return

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

		if (!moveDirection && (dx > 5 || dy > 5)) {
			moveDirection = dx > dy ? 'horizontal' : 'vertical'
		}

		if (moveDirection === 'horizontal' && e.cancelable) {
			e.preventDefault()
		}

		if (dx > moveThreshold || dy > moveThreshold) moved = true
	}

	const onTouchEnd = (e) => {
		if (!started) return
		started = false

		if (moved) {
			startTarget = null
			return
		}

		const duration = Date.now() - startTime
		if (duration > maxDuration) {
			startTarget = null
			return
		}

		const target = startTarget
		startTarget = null

		if (!target || !target.isConnected) return

		// ★ 方案 A：阻止浏览器合成原生 click
		if (e.cancelable) e.preventDefault()

		// ★ 方案 C：记录时间戳，用于拦截可能漏网的原生 click
		lastSyntheticClickTs = Date.now()

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

	// ★ 方案 C：捕获阶段拦截紧随其后的原生 click
	const onClickCapture = (e) => {
		// 只拦浏览器原生合成的 click（isTrusted === true）
		if (!e.isTrusted) return
		// 时间窗口内才拦
		if (Date.now() - lastSyntheticClickTs < 50) {
			e.stopPropagation()
			e.preventDefault()
			lastSyntheticClickTs = 0
		}
	}

	document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
	document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
	document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true }) // ★ 改 false
	document.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true })
	document.addEventListener('click', onClickCapture, true) // ★ 新增

	return () => {
		document.removeEventListener('touchstart', onTouchStart, true)
		document.removeEventListener('touchmove', onTouchMove, true)
		document.removeEventListener('touchend', onTouchEnd, true)
		document.removeEventListener('touchcancel', onTouchCancel, true)
		document.removeEventListener('click', onClickCapture, true)
	}
}