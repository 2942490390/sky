// common/features/wing.js
// 光翼 / 无翼 / 人物发光 / 炸翼 / 大跳

import { getPtr, writeSafe } from '../h5gg.js'
import { setAddr } from '../addressRegistry.js'

// ================= 设置光翼数量 =================
export async function setWingCount(value) {
    const v = Number(value)
    if (!Number.isFinite(v)) return false
    const addr = await getPtr('gysl')
    if (!addr || addr <= 0) return false
    setAddr('wingCount', addr, { type: 'I32' })
    return writeSafe(addr, v, 'I32')
}

// ================= 变成无翼 =================
export async function setWY(value) {
    const addr = await getPtr('energy')
    if (!addr || addr <= 0) return false
    const wyAddr = addr + 0x98
    setAddr('wyAddr', wyAddr, { type: 'F32' })
    return writeSafe(wyAddr, value ? -1.0 : 1.0, 'F32')
}

// ================= 设置高度 =================
export async function setGoldF32(value) {
    const v = parseFloat(value)
    if (!Number.isFinite(v)) return false
    const addr = await getPtr('goldF32')
    if (!addr || addr <= 0) return false
    return writeSafe(addr, v, 'F32')
}

// ================= 人物发光 =================
export async function setPlayerGlow(value = 1.0) {
    const v = parseFloat(value)
    if (!Number.isFinite(v)) return false
    const energyAddr = await getPtr('energy')
    if (!energyAddr || energyAddr <= 0) return false
    const glowAddr = energyAddr + 0x19AC
    if (!glowAddr || glowAddr <= 0) return false
    setAddr('glowAddr', glowAddr, { type: 'F32' })
    return writeSafe(glowAddr, v, 'F32')
}

// ================= 高危炸翼 =================
let wingBurstAddr = null

export async function setWingBurst(value) {
    const v = Number(value)
    if (!Number.isFinite(v)) return false

    if (!wingBurstAddr) {
        wingBurstAddr = await getPtr('zy')
        uni.showToast({
            icon: 'none',
            title: wingBurstAddr ? '0x' + wingBurstAddr.toString(16) : '未找到'
        })
        if (wingBurstAddr) setAddr('wingBurst', wingBurstAddr, { type: 'I32' })
    }
    if (!wingBurstAddr) return false

    return writeSafe(wingBurstAddr, v, 'I32')
}

export function clearWingBurstAddr() {
    wingBurstAddr = null
}

// ================= 大跳 =================
let bigJumpAddr = null
let bigJumpTimer = null
let currentBigJump = 0

export async function setBigJump(value) {
    const v = Number(value)
    if (!Number.isFinite(v)) return false

    currentBigJump = v

    if (!bigJumpAddr) {
        bigJumpAddr = await getPtr('bigjump')
        uni.showToast({
            icon: 'none',
            title: bigJumpAddr ? '0x' + bigJumpAddr.toString(16) : '未找到'
        })
    }
    if (!bigJumpAddr) return false

    return writeSafe(bigJumpAddr, v, 'F32')
}

export async function bigJumpLoop(enabled, value) {
    if (bigJumpTimer) {
        clearTimeout(bigJumpTimer)
        bigJumpTimer = null
    }
    if (!enabled) return

    const v = Number(value)
    if (Number.isFinite(v)) currentBigJump = v

    if (!bigJumpAddr) {
        bigJumpAddr = await getPtr('bigjump')
        uni.showToast({
            icon: 'none',
            title: bigJumpAddr ? '0x' + bigJumpAddr.toString(16) : '未找到'
        })
    }
    if (!bigJumpAddr) return

    writeSafe(bigJumpAddr, currentBigJump, 'F32')
    bigJumpTimer = setTimeout(() => bigJumpLoop(true, currentBigJump), 100)
}

export function stopBigJumpLoop() {
    if (bigJumpTimer) {
        clearTimeout(bigJumpTimer)
        bigJumpTimer = null
    }
    currentBigJump = 0
}

export function clearBigJumpAddr() {
    bigJumpAddr = null
}

// ================= 供 index.js 统一清理 =================
export function clearWingCaches() {
    wingBurstAddr = null
    bigJumpAddr = null
}