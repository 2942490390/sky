// common/offsetsStore.js

import { getLabel } from './functionLabels.js'
import OFFSETS_CONFIG from './offsets.config.js'

const STORAGE_KEY = 'sky_offsets_config'
const HASH_KEY = 'sky_offsets_hash'

// ============================================================
// 解析配置（兼容 number 和 '0x...' 字符串）
// ============================================================
function parseOffsets(raw) {
	if (!raw || typeof raw !== 'object') return null

	const result = {}
	for (const key in raw) {
		try {
			const item = raw[key]
			if (!Array.isArray(item) || item.length < 2) continue

			const base = typeof item[0] === 'number'
				? item[0]
				: parseInt(String(item[0]).replace(/^0[xX]/, ''), 16)
			if (!Number.isFinite(base)) continue

			const chain = []
			const rawChain = Array.isArray(item[1]) ? item[1] : []
			for (const n of rawChain) {
				const v = typeof n === 'number'
					? n
					: parseInt(String(n).replace(/^0[xX]/, ''), 16)
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
// JS 默认配置（只解析一次）
// ============================================================
let _defaultOffsets = null

function getDefaultOffsets() {
	if (_defaultOffsets) return _defaultOffsets
	const parsed = parseOffsets(OFFSETS_CONFIG)
	if (parsed) _defaultOffsets = parsed
	return _defaultOffsets
}

// ============================================================
// FNV-1a 32bit hash（用于判断 JS 配置是否变了）
// ============================================================
function hashOffsets(offsets) {
	if (!offsets) return '0'
	const keys = Object.keys(offsets).sort()
	let str = ''
	for (const k of keys) {
		const [base, chain] = offsets[k]
		str += k + ':' + base + ':' + chain.join(',') + ';'
	}
	let h = 0x811c9dc5
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i)
		h = (h * 0x01000193) >>> 0
	}
	return h.toString(16)
}

// ============================================================
// 本地缓存读写
// ============================================================
function getCachedOffsets() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (!raw) return null
		const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
		if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
			return null
		}
		return parsed
	} catch (e) {
		console.warn('[offsetsStore] 读取缓存失败', e)
		return null
	}
}

function getStoredHash() {
	try {
		return String(uni.getStorageSync(HASH_KEY) || '')
	} catch (e) {
		return ''
	}
}

function setStoredHash(hash) {
	try {
		uni.setStorageSync(HASH_KEY, hash)
	} catch (e) { }
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

/** 当前 JS 配置的 hash */
export function getConfigHash() {
	return hashOffsets(getDefaultOffsets())
}

/** 本地记录的 hash（用户保存时写入） */
export function getStoredConfigHash() {
	return getStoredHash()
}

/**
 * 加载配置：
 *   - 有本地缓存 → 用缓存
 *   - 无本地缓存 → 用 JS 配置（不自动写缓存！）
 */
export function loadOffsets() {
	const cached = getCachedOffsets()
	if (cached) return cached
	return getDefaultOffsets()
}

/**
 * 用户保存配置 → 写缓存 + 记录当前 JS hash
 */
export function saveOffsets(offsets) {
	try {
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(offsets))
		uni.setStorageSync(HASH_KEY, getConfigHash())
		return true
	} catch (e) {
		return false
	}
}

/**
 * 恢复默认 → 清空本地缓存，回到"无缓存"状态（用 JS 配置）
 */
export function resetOffsets() {
	clearCache()
	return getDefaultOffsets()
}

/**
 * 清空缓存（回到 JS 配置）
 */
export function clearCache() {
	try {
		uni.removeStorageSync(STORAGE_KEY)
		uni.removeStorageSync(HASH_KEY)
	} catch (e) { }
}

/**
 * 导出 JS 代码
 */
export function exportAsJS(offsets) {
	const lines = Object.keys(offsets).map(k => {
		const [base, chain] = offsets[k]
		const baseStr = '0x' + Number(base).toString(16).toUpperCase()
		const chainStr = '[' + chain.map(n => '0x' + Number(n).toString(16).toUpperCase()).join(', ') + ']'
		return `    ${k}: [${baseStr}, ${chainStr}],`
	})
	return '{\n' + lines.join('\n') + '\n}'
}

// ============================================================
// ★ 解耦核心：只返回状态，不弹窗
// ============================================================

/**
 * 获取当前配置的更新状态（纯数据，不涉及 UI）
 *
 * @returns {{
 *   hasCache: boolean,     // 本地是否有缓存
 *   hasUpdate: boolean,    // JS 是否更新过（hash 不一致）
 *   cachedHash: string,    // 本地记录的 hash
 *   currentHash: string,   // 当前 JS hash
 *   isFirstTime: boolean   // 本地有缓存但没有 hash（旧版本升级）
 * }}
 */
export function getUpdateStatus() {
	const cached = getCachedOffsets()
	const currentHash = getConfigHash()
	const cachedHash = getStoredHash()

	if (!cached) {
		return {
			hasCache: false,
			hasUpdate: false,
			cachedHash,
			currentHash,
			isFirstTime: false
		}
	}

	// 有缓存但没有 hash（旧版本升级上来的）→ 视为首次
	if (!cachedHash) {
		return {
			hasCache: true,
			hasUpdate: false,
			cachedHash: '',
			currentHash,
			isFirstTime: true
		}
	}

	return {
		hasCache: true,
		hasUpdate: cachedHash !== currentHash,
		cachedHash,
		currentHash,
		isFirstTime: false
	}
}

/**
 * ★ 应用新版本（用户点「是」时调用）
 *   把 JS 配置写入缓存，并更新 hash
 */
export function applyNewConfig() {
	try {
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(getDefaultOffsets()))
		uni.setStorageSync(HASH_KEY, getConfigHash())
		return true
	} catch (e) {
		return false
	}
}

/**
 * ★ 保留本地配置（用户点「否」时调用）
 *   只更新 hash，避免下次再弹
 */
export function keepLocalConfig() {
	try {
		uni.setStorageSync(HASH_KEY, getConfigHash())
		return true
	} catch (e) {
		return false
	}
}

/**
 * ★ 静默记录当前 hash
 *   用于旧版本升级：本地有缓存但没 hash，不想弹窗，直接补上 hash
 */
export function syncHashSilently() {
	try {
		uni.setStorageSync(HASH_KEY, getConfigHash())
		return true
	} catch (e) {
		return false
	}
}