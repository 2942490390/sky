// common/offsetsStore.js

import {
	getLabel
} from './functionLabels.js'

// ★ 从独立配置文件导入
import OFFSETS_CONFIG from './offsets.config.js'

const STORAGE_KEY = 'sky_offsets_config'


// ============================================================
// ★ 解析配置（兼容 number 和 '0x...' 字符串）
// ============================================================
function parseOffsets(raw) {
	if (!raw || typeof raw !== 'object') return null

	const result = {}
	for (const key in raw) {
		try {
			const item = raw[key]
			if (!Array.isArray(item) || item.length < 2) continue

			const base = typeof item[0] === 'number' ?
				item[0] :
				parseInt(String(item[0]).replace(/^0[xX]/, ''), 16)
			if (!Number.isFinite(base)) continue

			const chain = []
			const rawChain = Array.isArray(item[1]) ? item[1] : []
			for (const n of rawChain) {
				const v = typeof n === 'number' ?
					n :
					parseInt(String(n).replace(/^0[xX]/, ''), 16)
				if (Number.isFinite(v)) chain.push(v)
			}

			result[key] = [base, chain]
		} catch (e) {
			console.warn('[offsetsStore] 解析配置项失败:', key, e)
		}
	}

	return Object.keys(result).length > 0 ? result : null
}

// ============================================================
// ★ 启动时解析一次，缓存
// ============================================================
let _defaultOffsets = null

function getDefaultOffsets() {
	if (_defaultOffsets) return _defaultOffsets

	const parsed = parseOffsets(OFFSETS_CONFIG)
	if (parsed) {
		_defaultOffsets = parsed
		// console.log('[offsetsStore] 使用 offsets.config.js 配置')
	}
	return _defaultOffsets
}

// ============================================================
// 对外 API
// ============================================================

export function getAllKeys() {
	return Object.keys(getDefaultOffsets())
}

export function getKeyOptions() {
	return getAllKeys().map(key => ({
		key,
		label: getLabel(key)
	}))
}

export function loadOffsets() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (raw) {
			const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
			if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
				return parsed
			}
		}
	} catch (e) {
		console.warn('[offsetsStore] loadOffsets 失败', e)
	}
	return getDefaultOffsets()
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
	const def = getDefaultOffsets()
	saveOffsets(def)
	return def
}

export function exportAsJS(offsets) {
	const lines = Object.keys(offsets).map(k => {
		const [base, chain] = offsets[k]
		const baseStr = '0x' + Number(base).toString(16).toUpperCase()
		const chainStr = '[' + chain.map(n => '0x' + Number(n).toString(16).toUpperCase()).join(', ') + ']'
		return `    ${k}: [${baseStr}, ${chainStr}],`
	})
	return '{\n' + lines.join('\n') + '\n}'
}