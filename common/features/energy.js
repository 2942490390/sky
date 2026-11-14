// common/features/energy.js
// 无限能量 / 无限烟花 / 全局加速

import { writeSafe } from '../h5gg.js'
import { getPtr } from '../h5gg.js'
import { setAddr } from '../addressRegistry.js'

// ================= 无限能量 =================
let energyTimer = null
let energyAddr = null

export async function energyLoop(checked, num = 99) {
    if (energyTimer) {
        clearTimeout(energyTimer)
        energyTimer = null
    }
    if (!checked) return

    if (!energyAddr) {
        energyAddr = await getPtr('energy')
    }
    if (!energyAddr) return

    writeSafe(energyAddr, num, 'F32')
    energyTimer = setTimeout(() => energyLoop(true, num), 100)
}

export function stopEnergyLoop() {
    if (energyTimer) {
        clearTimeout(energyTimer)
        energyTimer = null
    }
    energyAddr = null
}

// ================= 无限烟花 =================
let fireworkTimer = null
let fireworkAddr = null

export async function fireworkLoop(checked, num = 5) {
    if (fireworkTimer) {
        clearTimeout(fireworkTimer)
        fireworkTimer = null
    }
    if (!checked) return

    if (!fireworkAddr) {
        fireworkAddr = await getPtr('wxyh')
        uni.showToast({
            icon: 'none',
            title: fireworkAddr ? '0x' + fireworkAddr.toString(16) : '未找到'
        })
    }
    if (!fireworkAddr) return

    writeSafe(fireworkAddr, num, 'I32')
    fireworkTimer = setTimeout(() => fireworkLoop(true, num), 50)
}

export function stopFireworkLoop() {
    if (fireworkTimer) {
        clearTimeout(fireworkTimer)
        fireworkTimer = null
    }
    fireworkAddr = null
}

// ================= 全局加速 =================
const SPEED_FEATURE_I32 = '1023969417'
const SPEED_SEARCH_FROM = '0x130000000'
const SPEED_SEARCH_TO = '0x170000000'
const SPEED_NEARBY_VALUE = '1.000000'
const SPEED_NEARBY_RANGE = '0x64'
const SPEED_OFFSET_NEXT = 24

let speedTimer = null
let speedAddr = null
let currentSpeed = 1.0

export async function findSpeedAddr() {
    try {
        if (typeof h5gg === 'undefined' || typeof h5gg.searchNumber !== 'function') {
            return null
        }

        if (speedAddr) {
            try {
                const test = h5gg.getValue('0x' + speedAddr.toString(16), 'F32')
                if (test !== undefined && test !== null) {
                    console.log('[加速] 使用缓存 B = 0x' + speedAddr.toString(16))
                    return speedAddr
                }
            } catch (e) {
                speedAddr = null
            }
        }

        h5gg.clearResults()
        h5gg.searchNumber(SPEED_FEATURE_I32, 'I32', SPEED_SEARCH_FROM, SPEED_SEARCH_TO)
        h5gg.searchNearby(SPEED_NEARBY_VALUE, 'F32', SPEED_NEARBY_RANGE)

        const count = h5gg.getResultsCount()
        if (!count) {
            h5gg.clearResults()
            return null
        }

        const raw = h5gg.getResults(count) || []
        console.log('[加速] 搜索结果', ...raw.map(r => r.address))

        const results = []
        for (let i = 0; i < raw.length; i++) results.push(raw[i])

        const addrSet = new Set()
        for (let i = 0; i < results.length; i++) {
            const item = results[i]
            if (!item || !item.address) continue
            const n = Number(item.address)
            if (Number.isFinite(n) && n > 0) addrSet.add(n)
        }

        for (let i = 0; i < results.length; i++) {
            const item = results[i]
            if (!item || !item.address) continue
            if (item.type !== 'I32') continue

            const addrNum = Number(item.address)
            if (!Number.isFinite(addrNum) || addrNum <= 0) continue

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
            if (v0 !== 1023969417) continue

            const bAddr = addrNum + SPEED_OFFSET_NEXT
            if (!addrSet.has(bAddr)) continue

            const bAddrHex = '0x' + bAddr.toString(16)
            console.log('[加速] 校验 B 地址：', bAddrHex)
            let v1
            try {
                v1 = Number(h5gg.getValue(bAddrHex, 'F32'))
            } catch (e) {
                continue
            }
            if (Math.abs(v1 - 1) > 0.0001) continue

            h5gg.clearResults()
            speedAddr = bAddr
            return bAddr
        }

        h5gg.clearResults()
        return null
    } catch (e) {
        return null
    }
}

export async function speedLoop(enabled, value) {
    if (speedTimer) {
        clearTimeout(speedTimer)
        speedTimer = null
    }

    if (!enabled) {
        if (speedAddr) {
            writeSafe(speedAddr, 1.0, 'F32')
        }
        currentSpeed = 1.0
        return
    }

    if (typeof value === 'number' && !isNaN(value)) currentSpeed = value

    if (!speedAddr) {
        speedAddr = await findSpeedAddr()
        setAddr('speedAddr', speedAddr, { type: 'F32' })
    }
    if (!speedAddr) return

    writeSafe(speedAddr, currentSpeed, 'F32')
    speedTimer = setTimeout(() => speedLoop(true), 100)
}

export function setSpeed(value) {
    if (typeof value !== 'number' || isNaN(value)) return
    currentSpeed = value
    if (speedAddr) {
        writeSafe(speedAddr, currentSpeed, 'F32')
        setAddr('speedAddr', speedAddr, { type: 'F32', value: currentSpeed })
    }
}

export function stopSpeedLoop() {
    if (speedTimer) {
        clearTimeout(speedTimer)
        speedTimer = null
    }
    if (speedAddr) {
        writeSafe(speedAddr, 1.0, 'F32')
    }
    currentSpeed = 1.0
}

export function clearSpeedAddr() {
    speedAddr = null
}

// ================= 供 index.js 统一清理 =================
export function clearEnergyCaches() {
    energyAddr = null
    fireworkAddr = null
    speedAddr = null
}
