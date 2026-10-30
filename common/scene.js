// common/scene.js
import {
	getPtr
} from './h5gg.js'

// ================= 场景亮度地址搜索 =================

// 搜索常量
const BRIGHTNESS_FEATURE_I32 = '-1094451199' // 特征值（I32）
const BRIGHTNESS_SEARCH_FROM = '0x100000000'
const BRIGHTNESS_SEARCH_TO = '0x130000000'
const BRIGHTNESS_CHECK_F32 = -0.382813 // 候选地址处的 F32 校验值

// 缓存
let sceneBrightnessAddr = null // 场景亮度地址（Number）
let brightnessTimer = null // 循环定时器
let currentBrightness = 0.3 // 当前亮度值

/**
 * 搜索场景亮度地址
 *
 * 逻辑：
 *   1. 清空搜索结果
 *   2. 搜索 I32 == -1094451199（连续两次）
 *   3. 遍历结果，对每个候选地址读 F32，判断是否 === -0.382813
 *   4. 若是 → 地址步进 -4 字节（即候选地址 - 4），该地址即场景亮度地址
 *   5. 缓存并返回
 *
 * @returns {Promise<number|null>} 场景亮度地址，失败返回 null
 */
export async function findSceneBrightnessAddr() {
	try {
		if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
			return null
		}

		// ★ 缓存命中：验证地址仍可读
		if (sceneBrightnessAddr) {
			try {
				const test = h5gg.getValue('0x' + sceneBrightnessAddr.toString(16), 'F32')
				if (test !== undefined && test !== null) {
					return sceneBrightnessAddr
				}
			} catch (e) {
				sceneBrightnessAddr = null
			}
		}

		// 1. 清空 + 连续搜索两次特征值
		h5gg.clearResults()
		h5gg.searchNumber(BRIGHTNESS_FEATURE_I32, 'I32', BRIGHTNESS_SEARCH_FROM, BRIGHTNESS_SEARCH_TO)
		h5gg.searchNumber(BRIGHTNESS_FEATURE_I32, 'I32', BRIGHTNESS_SEARCH_FROM, BRIGHTNESS_SEARCH_TO)

		// 2. 拿结果
		const count = h5gg.getResultsCount()
		if (!count) {
			h5gg.clearResults()
			return null
		}

		const raw = h5gg.getResults(count) || []
		const results = []
		for (let i = 0; i < raw.length; i++) results.push(raw[i])

		// 3. 遍历候选，校验 F32 === -0.382813
		for (let i = 0; i < results.length; i++) {
			const item = results[i]
			if (!item || !item.address) continue
			if (item.type !== 'I32') continue

			const addrNum = Number(item.address)
			if (!Number.isFinite(addrNum) || addrNum <= 0) continue

			// 校验 I32 值 == -1094451199
			let v0
			if (item.value !== undefined && item.value !== null) {
				v0 = Number(item.value)
			} else {
				try {
					v0 = Number(h5gg.getValue(item.address, 'I32'))
				} catch (e) {
					continue
				}
			}
			if (v0 !== -1094451199) continue

			// 读该地址 F32，判断是否 === -0.382813
			let f32Val
			try {
				f32Val = Number(h5gg.getValue(item.address, 'F32'))
			} catch (e) {
				continue
			}
			if (Math.abs(f32Val - BRIGHTNESS_CHECK_F32) > 0.0000001) continue

			// ★ 匹配成功：地址步进 -4 字节 → 场景亮度地址
			const brightnessAddr = addrNum - 4
			if (brightnessAddr <= 0) continue

			// 校验步进后的地址可读
			try {
				h5gg.getValue('0x' + brightnessAddr.toString(16), 'F32')
			} catch (e) {
				continue
			}

			h5gg.clearResults()
			sceneBrightnessAddr = brightnessAddr
			return brightnessAddr
		}

		h5gg.clearResults()
		return null
	} catch (e) {
		return null
	}
}

/**
 * 设置场景亮度
 * @param {number} value 亮度值
 * @returns {Promise<boolean>}
 */
export async function setSceneBrightness(value) {
	const v = Number(value)
	if (!Number.isFinite(v)) return false

	currentBrightness = v

	if (!sceneBrightnessAddr) {
		sceneBrightnessAddr = await findSceneBrightnessAddr()
		if (sceneBrightnessAddr) {
			uni.showToast({
				icon: 'none',
				title: '亮度地址 0x' + sceneBrightnessAddr.toString(16),
				duration: 1200
			})
		}
	}
	if (!sceneBrightnessAddr) {
		uni.showToast({
			icon: 'none',
			title: '未找到亮度地址',
			duration: 1200
		})
		return false
	}

	try {
		h5gg.setValue('0x' + sceneBrightnessAddr.toString(16), v, 'F32')
		return true
	} catch (e) {
		return false
	}
}

/**
 * 场景亮度循环写入（防止游戏重置）
 * @param {boolean} enabled 是否开启
 * @param {number} value 亮度值
 * @param {number} interval 写入间隔 ms，默认 100
 */
export async function sceneBrightnessLoop(enabled, value, interval = 100) {
	if (brightnessTimer) {
		clearTimeout(brightnessTimer)
		brightnessTimer = null
	}

	if (!enabled) {
		currentBrightness = 0.3
		return
	}

	const v = Number(value)
	if (Number.isFinite(v)) currentBrightness = v

	if (!sceneBrightnessAddr) {
		sceneBrightnessAddr = await findSceneBrightnessAddr()
		if (sceneBrightnessAddr) {
			uni.showToast({
				icon: 'none',
				title: '亮度地址 0x' + sceneBrightnessAddr.toString(16),
				duration: 1200
			})
		}
	}
	if (!sceneBrightnessAddr) {
		uni.showToast({
			icon: 'none',
			title: '未找到亮度地址',
			duration: 1200
		})
		return
	}

	try {
		h5gg.setValue('0x' + sceneBrightnessAddr.toString(16), currentBrightness, 'F32')
	} catch (e) {}

	brightnessTimer = setTimeout(() => sceneBrightnessLoop(true, currentBrightness, interval), interval)
}

/**
 * 停止场景亮度循环
 */
export function stopSceneBrightnessLoop() {
	if (brightnessTimer) {
		clearTimeout(brightnessTimer)
		brightnessTimer = null
	}
	// ★ 不清 sceneBrightnessAddr，保留缓存
	currentBrightness = 0.3
}

/**
 * 清除场景亮度地址缓存
 */
export function clearSceneBrightnessAddr() {
	sceneBrightnessAddr = null
}