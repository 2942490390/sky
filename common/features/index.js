// common/features/index.js
// 功能模块统一清理入口

import { clearEnergyCaches } from './energy.js'
import { clearBurnBloomCaches } from './burnBloom.js'
import { clearWingCaches } from './wing.js'
import { clearWarpCaches } from './warp.js'

/**
 * 清所有功能模块的地址缓存
 * h5gg.clearAllAddrCache() 内部调用
 */
export function clearFeatureCaches() {
    clearEnergyCaches()
    clearBurnBloomCaches()
    clearWingCaches()
    clearWarpCaches()
}