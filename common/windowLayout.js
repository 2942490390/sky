// common/windowLayout.js

/**
 * 获取设备物理分辨率（竖屏基准）
 */
function getScreenSize() {
	let sw = 852,
		sh = 393

	if (typeof screen !== 'undefined') {
		if (screen.width && screen.width > 0) sw = screen.width
		if (screen.height && screen.height > 0) sh = screen.height
	}

	if ((!sw || !sh || sw === sh) && typeof h5gg !== 'undefined') {
		try {
			if (typeof h5gg.getScreenSize === 'function') {
				const s = h5gg.getScreenSize()
				if (s && s.width && s.height) {
					sw = s.width
					sh = s.height
				}
			}
		} catch (e) {}
	}

	if (!sw || !sh || sw === sh) {
		const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 3
		const MODELS = [{
				dpr: 3,
				w: 430,
				h: 932
			},
			{
				dpr: 3,
				w: 393,
				h: 852
			},
			{
				dpr: 3,
				w: 390,
				h: 844
			},
			{
				dpr: 3,
				w: 428,
				h: 926
			},
			{
				dpr: 2,
				w: 414,
				h: 896
			},
			{
				dpr: 2,
				w: 375,
				h: 667
			},
			{
				dpr: 2,
				w: 320,
				h: 568
			}
		]
		const match = MODELS.find(m => m.dpr === Math.round(dpr)) || MODELS[1]
		sw = match.w
		sh = match.h
	}

	return {
		sw,
		sh
	}
}

/**
 * 按方向计算窗口尺寸
 * @param {'landscape'|'portrait'} mode
 */
function calcRectByMode(mode) {
	const {
		sw,
		sh
	} = getScreenSize()

	let screenW, screenH
	if (mode === 'landscape') {
		screenW = Math.max(sw, sh)
		screenH = Math.min(sw, sh)
	} else {
		screenW = Math.min(sw, sh)
		screenH = Math.max(sw, sh)
	}

	let winW, winH
	if (mode === 'landscape') {
		winW = Math.floor(screenW * 0.7)
		winH = Math.floor(screenH * 0.95)
	} else {
		winW = Math.floor(screenW * 0.95)
		winH = Math.floor(screenH * 0.8)
	}

	if (winW < 300) winW = 300
	if (winH < 300) winH = 300

	const x = Math.floor((screenW - winW) / 2)
	const y = Math.floor((screenH - winH) / 2)

	return {
		x,
		y,
		w: winW,
		h: winH,
		mode,
		screenW,
		screenH
	}
}

/**
 * 首次加载：强制横屏
 */
export function calcWindowRect() {
	return calcRectByMode('landscape')
}

/**
 * 应用窗口布局（横屏）
 */
export function applyWindowLayout() {
	if (typeof setWindowRect !== 'function') {
		console.warn('[windowLayout] setWindowRect 不可用')
		return null
	}
	const rect = calcWindowRect()
	console.log('[windowLayout] 横屏(首次)',
		`窗口:${rect.w}x${rect.h} @ (${rect.x},${rect.y})`,
		`屏幕:${rect.screenW}x${rect.screenH}`)
	try {
		setWindowRect(rect.x, rect.y, rect.w, rect.h)
	} catch (e) {
		console.error('[windowLayout] setWindowRect 失败:', e)
	}
	return rect
}

/**
 * 按回调参数设置窗口（方向变化时用）
 * @param {number} w setLayoutAction 回调的宽
 * @param {number} h setLayoutAction 回调的高
 */
function applyByCallbackSize(w, h) {
	if (typeof setWindowRect !== 'function') return null

	// 用回调的宽高判断方向
	const mode = w > h ? 'landscape' : 'portrait'

	// 用回调的宽高作为屏幕基准
	const screenW = w
	const screenH = h

	let winW, winH
	if (mode === 'landscape') {
		winW = Math.floor(screenW * 0.7)
		winH = Math.floor(screenH * 0.95)
	} else {
		winW = Math.floor(screenW * 0.95)
		winH = Math.floor(screenH * 0.8)
	}

	if (winW < 300) winW = 300
	if (winH < 300) winH = 300

	const x = Math.floor((screenW - winW) / 2)
	const y = Math.floor((screenH - winH) / 2)

	// console.log('[windowLayout] 方向变化',
	// 	mode,
	// 	`回调宽高:${w}x${h}`,
	// 	`窗口:${winW}x${winH} @ (${x},${y})`)

	try {
		setWindowRect(x, y, winW, winH)
	} catch (e) {
		console.error('[windowLayout] setWindowRect 失败:', e)
	}

	return {
		x,
		y,
		w: winW,
		h: winH,
		mode,
		screenW,
		screenH
	}
}

/**
 * 初始化窗口布局
 * - 首次：强制横屏
 * - 方向变化：用 setLayoutAction 回调的宽高切换
 */
export function initWindowLayout(onChange) {
	// 1. 首次：强制横屏
	const first = applyWindowLayout()
	if (first && onChange) onChange(first)

	// 2. 多次延迟重试，等 H5GG 坐标系同步
	const retryDelays = [200, 500, 1000, 1500]
	retryDelays.forEach(delay => {
		setTimeout(() => {
			const rect = applyWindowLayout()
			// ★ 只有 rect 有效才回调
			if (rect && onChange) onChange(rect)
		}, delay)
	})

	// 3. setLayoutAction
	if (typeof setLayoutAction === 'function') {
		setLayoutAction(function(w, h) {
			console.log('[windowLayout] setLayoutAction 回调:', w, h)
			const rect = applyByCallbackSize(w, h)
			// ★ 只有 rect 有效才回调
			if (rect && onChange) onChange(rect)
		})
	}
}