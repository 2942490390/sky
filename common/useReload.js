import {
	ref
} from 'vue'
import {
	clearOffsets,
	clearAllAddrCache
} from './h5gg.js'

export function useReload() {
	const visible = ref(true)
	const reloadKey = ref(0)
	let debounceTimer = null

	/**
	 * 防抖版 reload
	 * @param {number|Event} delay - 延迟毫秒数；传事件对象时自动用默认值
	 */
	function reload(delay = 300) {
		if (typeof delay !== 'number') delay = 300

		if (debounceTimer) {
			clearTimeout(debounceTimer)
			debounceTimer = null
		}
		debounceTimer = setTimeout(() => {
			debounceTimer = null
			clearOffsets()
			clearAllAddrCache()
			reloadKey.value++
		}, delay)
	}

	return {
		visible,
		reloadKey,
		reload
	}
}

export function onForceLandscape() {
	if (typeof setWindowRect !== 'function') return
	const w = window.screen.width
	const h = window.screen.height
	const isLandscape = w > h
	if (isLandscape) {
		setWindowRect(0, 0, h, w)
	} else {
		setWindowRect(0, 0, w, h)
	}
	setTimeout(() => {
		window.dispatchEvent(new Event('resize'))
	}, 300)
}