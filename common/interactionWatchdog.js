// common/interactionWatchdog.js
// 交互层看门狗（自包含版）：诊断 Safari hit-test 偏移，交给 onRepair 决策

const MAX_EVENTS = 200
const REPAIR_COOLDOWN = 3000
const STORAGE_KEY = '__SKY_INTERACTION_DIAG__'

function getInteractionDiagnostics() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) {
			const arr = JSON.parse(raw)
			if (Array.isArray(arr)) return arr
		}
	} catch (e) {}
	return []
}

function persist(events) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)))
	} catch (e) {}
}

function clearInteractionDiagnostics() {
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch (e) {}
	try {
		window.__SKY_INTERACTION_DIAGNOSTICS__ = []
	} catch (e) {}
}

function getInteractiveTarget(el) {
	if (!el || typeof el.closest !== 'function') return null
	return el.closest('button, input, select, textarea, a, [role="button"], [data-clickable]')
}

function getDiagnostics(event, target) {
	const vv = (typeof window !== 'undefined') ? window.visualViewport : null
	const t = (event.touches && event.touches[0]) ||
		(event.changedTouches && event.changedTouches[0]) ||
		event
	const clientX = t.clientX || 0
	const clientY = t.clientY || 0

	let elementAtPoint = null
	try {
		elementAtPoint = document.elementFromPoint(clientX, clientY)
	} catch (e) {}

	const describe = (el) => {
		if (!el) return null
		return {
			tag: el.tagName,
			id: el.id || '',
			className: typeof el.className === 'string' ? el.className : '',
			text: (el.innerText || el.textContent || '').slice(0, 20)
		}
	}

	return {
		ts: Date.now(),
		clientX,
		clientY,
		visualViewport: vv ? {
			width: vv.width,
			height: vv.height,
			offsetTop: vv.offsetTop,
			offsetLeft: vv.offsetLeft,
			scale: vv.scale
		} : null,
		innerW: typeof window !== 'undefined' ? window.innerWidth : 0,
		innerH: typeof window !== 'undefined' ? window.innerHeight : 0,
		scrollY: typeof window !== 'undefined' ? (window.scrollY || 0) : 0,
		target: describe(target),
		elementAtPoint: describe(elementAtPoint)
	}
}

export function installInteractionWatchdog(onRepair) {
	if (typeof document === 'undefined' || typeof window === 'undefined') {
		return () => {}
	}

	const events = getInteractionDiagnostics()
	let pending = null
	let lastRepairAt = 0
	let lastTouchTarget = null
	let lastTouchEvent = null
	let touchStartX = 0
	let touchStartY = 0
	let touchMoved = false

	const record = (type, event, target) => {
		const item = getDiagnostics(event, target)
		item.type = type
		events.push(item)
		persist(events)
		try {
			window.__SKY_INTERACTION_DIAGNOSTICS__ = events.slice(-MAX_EVENTS)
		} catch (e) {}
	}

	const clearPending = () => {
		if (pending) {
			clearTimeout(pending)
			pending = null
		}
	}

	const onTouchStart = (event) => {
		const t = event.touches && event.touches[0]
		touchStartX = t ? t.clientX : 0
		touchStartY = t ? t.clientY : 0
		touchMoved = false
		lastTouchTarget = getInteractiveTarget(event.target) || null
		lastTouchEvent = event
		if (lastTouchTarget) record('touchstart', event, lastTouchTarget)
	}

	const onTouchMove = (event) => {
		const t = event.touches && event.touches[0]
		if (!t) return
		const dx = Math.abs(t.clientX - touchStartX)
		const dy = Math.abs(t.clientY - touchStartY)
		if (dx > 10 || dy > 10) touchMoved = true
	}

	const onClick = (event) => {
		const target = getInteractiveTarget(event.target)
		if (target) record('click', event, target)
		clearPending()
	}

	const onTouchEnd = (event) => {
		if (touchMoved) return

		const target = getInteractiveTarget(event.target)
		if (!target || target.disabled) return

		record('touchend', event, target)
		clearPending()

		pending = setTimeout(() => {
			pending = null
			const now = Date.now()
			if (now - lastRepairAt < REPAIR_COOLDOWN) return

			const diag = getDiagnostics(lastTouchEvent || event, target)

			// 用真实触点坐标判断命中
			const realEl = document.elementFromPoint(diag.clientX, diag.clientY)
			if (!realEl) return
			if (target.contains(realEl) || realEl.contains(target)) return // 命中正常

			lastRepairAt = now
			record('click-missed', lastTouchEvent || event, target)
			if (typeof onRepair === 'function') {
				onRepair('hit-test-mismatch', diag)
			}
		}, 500)
	}

	document.addEventListener('touchstart', onTouchStart, true)
	document.addEventListener('touchmove', onTouchMove, true)
	document.addEventListener('touchend', onTouchEnd, true)
	document.addEventListener('click', onClick, true)

	try {
		window.__SKY_INTERACTION_DIAGNOSTICS__ = events.slice(-MAX_EVENTS)
		window.__SKY_CLEAR_INTERACTION_DIAGNOSTICS__ = clearInteractionDiagnostics
	} catch (e) {}

	return () => {
		clearPending()
		document.removeEventListener('touchstart', onTouchStart, true)
		document.removeEventListener('touchmove', onTouchMove, true)
		document.removeEventListener('touchend', onTouchEnd, true)
		document.removeEventListener('click', onClick, true)
	}
}