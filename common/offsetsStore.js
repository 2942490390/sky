// common/offsetsStore.js

import { getLabel } from './functionLabels.js'

const STORAGE_KEY = 'sky_offsets_config'

const DEFAULT_OFFSETS = {
	energy: [0x54A3B48, [0xC48, 0x40, 0x5C30]],
	sudu: [0x54A3B48, [0xC48, 0x40, 0x5C40]],
	nengliang: [0x54A3B48, [0xC48, 0x40, 0x5C50]],
	daoju: [0x54A3B48, [0xC48, 0x40, 0x5C60]],
	lengqu: [0x54A3B48, [0xC48, 0x40, 0x5C70]],
	gysl: [0x54A3B48, [0xC48, 0x40, 0x5C80]],
	zy: [0x54A3B48, [0xC48, 0x40, 0x5C90]],
	lzaddr: [0x54A3B48, [0xC48, 0x40, 0x5CA0]],
	zhuahua: [0x54A3B48, [0xC48, 0x40, 0x5CB0]],
	wxyh: [0x54A38B8, [0xC70, 0x1B90, 0x49F4]],
	yclz: [0x53930B0, [0x6F48, 0x1088]]
}

/**
 * 导出所有支持的 key（从 DEFAULT_OFFSETS 动态生成）
 * 新增 key 只改 DEFAULT_OFFSETS，这里自动生效
 */
export function getAllKeys() {
	return Object.keys(DEFAULT_OFFSETS)
}

/**
 * 导出带 label 的 key 清单（供 picker 用）
 * label 从 functionLabels.js 查
 */
export function getKeyOptions() {
	return getAllKeys().map(key => ({
		key,
		label: getLabel(key)
	}))
}

export function loadOffsets() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw
	} catch (e) {}
	return JSON.parse(JSON.stringify(DEFAULT_OFFSETS))
}

export function saveOffsets(offsets) {
	try {
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(offsets))
		return true
	} catch (e) {
		return false
	}
}

export function resetOffsets() {
	const def = JSON.parse(JSON.stringify(DEFAULT_OFFSETS))
	saveOffsets(def)
	return def
}

export function exportAsJS(offsets) {
	const lines = Object.keys(offsets).map(k => {
		const [base, chain] = offsets[k]
		const baseStr = '0x' + Number(base).toString(16).toUpperCase()
		const chainStr = '[' + chain.map(n => '0x' + Number(n).toString(16).toUpperCase()).join(', ') + ']'
		return `  ${k}: [${baseStr}, ${chainStr}],`
	})
	return 'const DEFAULT_OFFSETS = {\n' + lines.join('\n') + '\n}'
}