// common/responsiveChecker.js

let lastHeartbeat = Date.now()
let unresponsiveCount = 0
let onUnresponsive = null

export function startResponsiveCheck(callback) {
    onUnresponsive = callback

    // 心跳检测
    setInterval(() => {
        const now = Date.now()
        const drift = now - lastHeartbeat - 1000
        lastHeartbeat = now

        if (drift > 500) {
            unresponsiveCount++
            console.warn('[responsive] 偏差', drift, 'ms，次数', unresponsiveCount)

            if (unresponsiveCount >= 3) {
                unresponsiveCount = 0
                if (onUnresponsive) onUnresponsive('heartbeat', drift)
            }
        } else {
            unresponsiveCount = 0
        }
    }, 1000)

    // 点击后 rAF 检测
    document.addEventListener('click', onDocumentClick, true)
}

function onDocumentClick() {
    const clickTime = performance.now()
    let frameFired = false

    requestAnimationFrame(() => {
        frameFired = true
        const delay = performance.now() - clickTime
        if (delay > 300) {
            console.warn('[responsive] 点击到下一帧耗时', delay, 'ms')
        }
    })

    setTimeout(() => {
        if (!frameFired) {
            console.warn('[responsive] 点击后 500ms rAF 未触发')
            if (onUnresponsive) onUnresponsive('click', 500)
        }
    }, 500)
}

export function stopResponsiveCheck() {
    document.removeEventListener('click', onDocumentClick, true)
    onUnresponsive = null
}