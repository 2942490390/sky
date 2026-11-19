// common/in-place/autoRunMap.js
// 任意门写字节切图跑图

import { goMapAnyDoor, initAnyDoor } from '../features/warp.js'
import { burnLoop, bloomLoop, stopBurnLoop, stopBloomLoop, xihuoOnce } from '../features/burnBloom.js'

let _running = false
let _stopRequested = false
let _timer = null

export function isAutoRunRunning() {
    return _running
}

export function stopAutoRunMap() {
    _stopRequested = true
    if (_timer) {
        clearTimeout(_timer)
        _timer = null
    }
    stopBurnLoop()
    stopBloomLoop()
    _running = false
}

function safeDelay(ms) {
    return new Promise(resolve => {
        _timer = setTimeout(() => {
            _timer = null
            resolve()
        }, ms)
    })
}

export async function startAutoRunMap(spots, onProgress) {
    if (_running) return { success: false, reason: 'already-running' }
    if (!Array.isArray(spots) || spots.length === 0) return { success: false, reason: 'no-spots' }

    _running = true
    _stopRequested = false

    try {
        // 1. 传回遇境（使用任意门）
        if (onProgress) onProgress(0, spots.length, { name: '返回遇境' })
        uni.showToast({ icon: 'none', title: '准备回遇境...' })

        // 初始化任意门
        const ok = await initAnyDoor()
        if (!ok) throw new Error('任意门初始化失败')

        // 写入返回遇境代码
        const warpR = await goMapAnyDoor('CandleSpace')
        if (!warpR.success) throw new Error('返回遇境失败')

        // 等待游戏切图完成
        await safeDelay(4000)
        if (_stopRequested) throw new Error('cancelled')

        // 2. 开启辅助
        uni.showToast({ icon: 'none', title: '开启自燃与炸花...' })
        burnLoop(true)
        bloomLoop(true)
        await safeDelay(1000)

        // 3. 开始循环跑图
        for (let i = 0; i < spots.length; i++) {
            if (_stopRequested) throw new Error('cancelled')

            const spot = spots[i]
            if (onProgress) onProgress(i + 1, spots.length, spot)

            uni.showToast({ icon: 'none', title: `传送至: ${spot.name}` })

            // 3.1 传送（调用任意门写字节）
            const warpRes = await goMapAnyDoor(spot.warpId)
            if (_stopRequested) throw new Error('cancelled')

            if (!warpRes.success) {
                console.warn(`[AutoRun] 传送 ${spot.name} 失败:`, warpRes.reason)
                await safeDelay(2000) // 失败也等一会，避免死循环
                continue
            }

            // 3.2 等待地图加载 (写字节传送通常需要3-4秒)
            await safeDelay(4000)
            if (_stopRequested) throw new Error('cancelled')

            // 3.3 吸火
            uni.showToast({ icon: 'none', title: `吸取烛火: ${spot.name}` })
            const xihuoOk = await xihuoOnce()
            if (!xihuoOk) {
                console.log(`[AutoRun] ${spot.name} 没有找到可吸的烛火`)
            }

            // 3.4 等待 5 秒 (给吸火后的恢复留时间)
            await safeDelay(5000)
        }

        if (onProgress) onProgress(spots.length, spots.length, { name: '跑图完成' })
        return { success: true, reason: 'done' }

    } catch (e) {
        if (e.message === 'cancelled') {
            return { success: false, reason: 'cancelled' }
        }
        console.error('[AutoRun] 异常:', e)
        return { success: false, reason: 'error', message: e.message }
    } finally {
        stopBurnLoop()
        stopBloomLoop()
        _running = false
        _stopRequested = false
    }
}