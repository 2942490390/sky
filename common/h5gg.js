// common/h5gg.js
// 核心：主内存范围、Offsets、指针解引用、写内存
// 功能模块拆分到 features/ 目录，本文件保持原 API 兼容（re-export）

import { point } from './getPoint.js'
import { setAddr, ADDR_META } from './addressRegistry.js'

// ============================================================
// h5gg 环境兜底
// ============================================================
if (typeof h5gg === 'undefined') {
	globalThis.h5gg = {
		getRangesList: () => [],
		getValue: () => 0,
		setValue: () => { },
		clearResults: () => { },
		searchNumber: () => { },
		searchNearby: () => { },
		editAll: () => { },
		getResults: () => [],
		getResultsCount: () => 0,
		require: () => { }
	}
	uni.showToast({ icon: 'none', title: '未检测到 H5GG 环境' })
}

// ============================================================
// 通用工具
// ============================================================
export function customDelay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

export function addrjump(addr) {
	return Number(h5gg.getValue(addr, 'U64'))
}

// ============================================================
// getMain 缓存
// ============================================================
let _mainCache = null
let _mainCacheTried = false

function getMain() {
	if (_mainCache) return _mainCache
	if (_mainCacheTried) return null
	_mainCacheTried = true

	let list = null
	try {
		list = h5gg.getRangesList('Sky-iOS-Gold')
	} catch (e) { }

	if (!list || list.length === 0) {
		try {
			const all = h5gg.getRangesList(0)
			for (let i = 0; i < all.length; i++) {
				if (String(all[i].name || '').indexOf('Sky-iOS-Gold') !== -1) {
					list = [all[i]]
					break
				}
			}
		} catch (e) { }
	}

	if (list && list.length > 0) {
		_mainCache = {
			mainBase: Number(list[0].start),
			mainEnd: Number(list[0].end),
			mainName: list[0].name
		}
		return _mainCache
	}

	return null
}

export function clearMainCache() {
	_mainCache = null
	_mainCacheTried = false
}

export function writeSafe(addrNum, val, type) {
	if (!addrNum || addrNum <= 0) return false
	try {
		h5gg.setValue('0x' + addrNum.toString(16), val, type)
		return true
	} catch (e) {
		return false
	}
}

// ============================================================
// Offsets 缓存
// ============================================================
let Offsets = null
let offsetsPromise = null

function ensureOffsets() {
	if (Offsets) return Promise.resolve(Offsets)
	if (!offsetsPromise) {
		offsetsPromise = Promise.resolve(point())
			.then(res => {
				Offsets = res || {}
				return Offsets
			})
			.catch(err => {
				offsetsPromise = null
				throw err
			})
	}
	return offsetsPromise
}

export function getModuleAddr(off) {
	const main = getMain()
	return main ? Number(main.mainBase) + off : 0
}

/**
 * 同步获取指针地址（自动 setAddr 上报给 DevMonitor）
 */
function getPtrSync(key) {
	if (!Offsets) return null
	const cfg = Offsets[key]
	if (!cfg) return null
	const main = getMain()
	if (!main) return null
	let addr = Number(main.mainBase) + cfg[0]
	const chain = cfg[1]
	for (let i = 0; i < chain.length - 1; i++) {
		addr = addrjump(addr) + chain[i]
	}
	const finalAddr = addrjump(addr) + chain[chain.length - 1]
	const meta = ADDR_META[key]
	setAddr(key, finalAddr, { type: meta ? meta.type : 'BASE' })
	return finalAddr
}

export async function getPtr(key) {
	await ensureOffsets()
	return getPtrSync(key)
}

export function clearOffsets() {
	Offsets = null
	offsetsPromise = null
	clearMainCache()
}

// ============================================================
// 功能模块 re-export（保持对外 API 不变）
// ============================================================
export * from './features/energy.js'
export * from './features/burnBloom.js'
export * from './features/wing.js'
export * from './features/warp.js'

// ============================================================
// 全局缓存清理（所有功能模块的地址缓存）
// ============================================================
import { clearFeatureCaches } from './features/index.js'

export function clearAllAddrCache() {
	clearFeatureCaches()
}