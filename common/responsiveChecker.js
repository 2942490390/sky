// common/responsiveChecker.js

let lastHeartbeat = Date.now()
let consecutiveDrifts = 0
let onUnresponsive = null
let paused = false
let heartbeatTimer = null
let lastReloadTime = 0           // ★ 记录上次刷新时间，防止频繁刷新
const RELOAD_COOLDOWN = 30000    // ★ 30 秒内不重复刷新

export function startResponsiveCheck(callback) {
    onUnresponsive = callback
    lastHeartbeat = Date.now()
    consecutiveDrifts = 0
    paused = false

    heartbeatTimer = setInterval(() => {
        if (paused) {
            lastHeartbeat = Date.now()
            return
        }

        const now = Date.now()
        const drift = now - lastHeartbeat - 1000
        lastHeartbeat = now

        // 阈值 3000ms，连续 3 次才报警
        if (drift > 3000) {
            consecutiveDrifts++
            console.warn('[responsive] 偏差', drift, 'ms，连续', consecutiveDrifts, '次')

            if (consecutiveDrifts >= 3) {
                consecutiveDrifts = 0
                if (onUnresponsive) onUnresponsive('heartbeat', drift)
            }
        } else {
            consecutiveDrifts = 0
        }
    }, 1000)

    document.addEventListener('click', onDocumentClick, true)
}

function onDocumentClick() {
    if (paused) return
    const clickTime = performance.now()
    let frameFired = false

    requestAnimationFrame(() => {
        frameFired = true
        const delay = performance.now() - clickTime
        if (delay > 500) {
            console.warn('[responsive] 点击到下一帧耗时', delay, 'ms')
        }
    })

    setTimeout(() => {
        if (!frameFired && !paused) {
            console.warn('[responsive] 点击后 800ms rAF 未触发')
            if (onUnresponsive) onUnresponsive('click', 800)
        }
    }, 800)
}

export function pauseResponsiveCheck() {
    paused = true
}

export function resumeResponsiveCheck() {
    paused = false
    lastHeartbeat = Date.now()
    consecutiveDrifts = 0
}

export function stopResponsiveCheck() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
    }
    document.removeEventListener('click', onDocumentClick, true)
    onUnresponsive = null
}

/**
 * ★ 强制刷新页面（带冷却）
 */
export function forceReloadPage() {
    const now = Date.now()
    if (now - lastReloadTime < RELOAD_COOLDOWN) {
        console.warn('[responsive] 刷新冷却中，跳过')
        return
    }
    lastReloadTime = now

    console.warn('[responsive] 执行强制刷新')

    // 方案 1：uni-app 环境
    if (typeof uni !== 'undefined' && typeof uni.reLaunch === 'function') {
        try {
            uni.reLaunch({ url: '/pages/index/index' })
            return
        } catch (e) {
            console.warn('[responsive] uni.reLaunch 失败，回退到 window.replace')
        }
    }

    // 方案 2：window.replace + 时间戳（强制跳过缓存）
    if (typeof window !== 'undefined' && window.location) {
        try {
            const url = window.location.href.split('?')[0]
            window.location.replace(url + '?t=' + Date.now())
        } catch (e) {
            console.error('[responsive] window.replace 失败:', e)
        }
    }
}