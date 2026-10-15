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
	}
	return _defaultOffsets
}

// ============================================================
// ★ 深比较两个 offsets 对象是否完全一致
//    key 集合一致 + 每个 key 的 base 一致 + chain 数组逐项一致
// ============================================================
function isSameOffsets(a, b) {
	if (!a || !b) return false

	const ka = Object.keys(a)
	const kb = Object.keys(b)
	if (ka.length !== kb.length) return false

	for (const k of ka) {
		if (!b[k]) return false

		const [baseA, chainA] = a[k]
		const [baseB, chainB] = b[k]

		if (Number(baseA) !== Number(baseB)) return false
		if (!Array.isArray(chainA) || !Array.isArray(chainB)) return false
		if (chainA.length !== chainB.length) return false

		for (let i = 0; i < chainA.length; i++) {
			if (Number(chainA[i]) !== Number(chainB[i])) return false
		}
	}
	return true
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

// ★ 核心：JS 配置永远权威，缓存只是镜像
export function loadOffsets() {
	const def = getDefaultOffsets()

	try {
		const raw = uni.getStorageSync(STORAGE_KEY)

		// 1. 本地没有缓存 → 用 JS 配置，并写入缓存
		if (!raw) {
			console.log('[offsetsStore] 无缓存，使用 JS 配置并写入缓存')
			uni.setStorageSync(STORAGE_KEY, JSON.stringify(def))
			return def
		}

		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw

		// 缓存非法 → 当作没有缓存
		if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
			console.log('[offsetsStore] 缓存非法，使用 JS 配置并覆盖缓存')
			uni.setStorageSync(STORAGE_KEY, JSON.stringify(def))
			return def
		}

		// 2. 缓存存在 → 和 JS 比对
		if (isSameOffsets(parsed, def)) {
			// 一致，直接用缓存（其实和 JS 一样）
			return parsed
		}

		// 3. 不一致 → 用 JS 的，并覆盖缓存
		console.log('[offsetsStore] 缓存与 JS 不一致，使用 JS 配置并覆盖缓存')
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(def))
		return def

	} catch (e) {
		console.warn('[offsetsStore] loadOffsets 失败，回退到 JS 配置', e)
		// 出错也保证返回 JS 配置
		return def
	}
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