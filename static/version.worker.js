// common/version.worker.js
// 运行在 Worker 线程，不阻塞主线程

let ENTRY_JS_URL = ''
let CHECK_INTERVAL = 30 * 1000
let currentHash = null
let timer = null

/**
 * 简单 hash
 */
function simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i)
        hash |= 0
    }
    return (hash >>> 0).toString(16)
}

/**
 * 拉取 JS 并算 hash（不走缓存）
 */
async function fetchHash(url) {
    try {
        const res = await fetch(url + '?t=' + Date.now(), {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        })
        if (!res.ok) return null
        const text = await res.text()
        return simpleHash(text)
    } catch (e) {
        return null
    }
}

/**
 * 一次检测
 */
async function checkOnce() {
    if (!ENTRY_JS_URL) return
    const newHash = await fetchHash(ENTRY_JS_URL)
    if (!newHash) return

    if (currentHash === null) {
        // 首次记录
        currentHash = newHash
        self.postMessage({ type: 'init', hash: newHash })
        return
    }

    if (newHash !== currentHash) {
        // hash 变了，通知主线程
        self.postMessage({
            type: 'changed',
            oldHash: currentHash,
            newHash: newHash
        })
        currentHash = newHash
        // ★ 通知后停止检测，等用户操作
        if (timer) {
            clearInterval(timer)
            timer = null
        }
    }
}

/**
 * 启动
 */
function start() {
    if (timer) clearInterval(timer)
    // 首次延迟 5 秒
    setTimeout(() => {
        checkOnce()
        timer = setInterval(checkOnce, CHECK_INTERVAL)
    }, 5000)
}

/**
 * 停止
 */
function stop() {
    if (timer) {
        clearInterval(timer)
        timer = null
    }
}

/**
 * 接收主线程消息
 */
self.onmessage = (e) => {
    const msg = e.data
    if (!msg || !msg.type) return

    switch (msg.type) {
        case 'start':
            ENTRY_JS_URL = msg.url || ''
            CHECK_INTERVAL = msg.interval || 30 * 1000
            start()
            break
        case 'stop':
            stop()
            break
        case 'checkNow':
            checkOnce()
            break
    }
}