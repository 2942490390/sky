// common/lockHeight.js
// 锁定高度（复用 coordRunner 的坐标读写）

import { getPtr } from './h5gg.js'

let lockTimer = null
let lockAddr = null
let lockValue = 0
let lockEnabled = false

/**
 * 获取高度地址（Y 轴，rwdz + 8）
 */
async function getHeightAddr() {
    if (lockAddr && lockAddr > 0) return lockAddr
    const addr = await getPtr('rwdz')
    if (!addr || addr <= 0) return null
    lockAddr = addr + 8   // ★ Y 轴偏移 +8
    return lockAddr
}

/**
 * 启动锁定高度
 * @param {number} value 要锁定的高度
 * @returns {Promise<boolean>}
 */
export async function startLockHeight(value) {
    const v = Number(value)
    if (!Number.isFinite(v)) return false

    const addr = await getHeightAddr()
    if (!addr || addr <= 0) return false

    lockValue = v
    lockEnabled = true

    if (lockTimer) {
        clearInterval(lockTimer)
        lockTimer = null
    }

    lockTimer = setInterval(() => {
        if (!lockEnabled) return
        try {
            h5gg.setValue('0x' + addr.toString(16), lockValue, 'F32')
        } catch (e) {
            stopLockHeight()
        }
    }, 30)

    return true
}

/**
 * 停止锁定高度
 */
export function stopLockHeight() {
    lockEnabled = false
    if (lockTimer) {
        clearInterval(lockTimer)
        lockTimer = null
    }
}

/**
 * 是否正在锁定
 */
export function isLockHeightRunning() {
    return lockEnabled
}

/**
 * 获取当前锁定值
 */
export function getLockHeightValue() {
    return lockValue
}

/**
 * 清除地址缓存（切换进程后调用）
 */
export function clearLockHeightAddr() {
    lockAddr = null
}