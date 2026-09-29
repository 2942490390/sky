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

        // 阈值 3000ms，连续 2 次才报警
        if (drift > 3000) {
            consecutiveDrifts++
            console.warn('[responsive] 偏差', drift, 'ms，连续', consecutiveDrifts, '次')

            if (consecutiveDrifts >= 2) {
                consecutiveDrifts = 0
                if (onUnresponsive) onUnresponsive('heartbeat', drift)
            }
        } else {
            consecutiveDrifts = 0
        }
    }, 1000)

    // 添加多种事件监听方式以提高Safari兼容性
    document.addEventListener('click', onDocumentClick, true)
    document.addEventListener('click', onDocumentClick, false)  // 同时捕获冒泡事件
    document.addEventListener('touchstart', onDocumentClick, true) // 添加触摸事件支持
}

function onDocumentClick(event) {
    if (paused) return

    // 记录点击时间
    const clickTime = performance.now()
    let frameFired = false

    // 尝试多种方法确保在Safari中也能检测到点击
    try {
        // 使用多种requestAnimationFrame调用方式确保兼容性
        requestAnimationFrame(function() {
            frameFired = true
            const delay = performance.now() - clickTime
            if (delay > 500) {
                console.warn('[responsive] 点击到下一帧耗时', delay, 'ms')
            }
        })

        // Safari兼容性处理：使用setTimeout作为备选方案
        setTimeout(function() {
            requestAnimationFrame(function() {
                frameFired = true
            })
        }, 0)
    } catch (e) {
        console.warn('[responsive] requestAnimationFrame异常:', e)
    }

    // 增加检测超时时间，考虑到Safari的特殊性
    setTimeout(() => {
        if (!frameFired && !paused) {
            console.warn('[responsive] 点击后 1000ms rAF 未触发')
            if (onUnresponsive) onUnresponsive('click', 1000)
        }
    }, 1000)
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
    // 移除所有添加的事件监听器
    document.removeEventListener('click', onDocumentClick, true)
    document.removeEventListener('click', onDocumentClick, false)
    document.removeEventListener('touchstart', onDocumentClick, true)
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