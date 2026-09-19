// common/versionCheck.js
// 主线程：只负责启动 Worker、收消息、弹窗、刷新

let worker = null
let started = false

/**
 * 获取入口 JS URL
 * 方法 1：写死（推荐，可控）
 * 方法 2：从 document.scripts 里找
 */
function getEntryScriptUrl() {
    // ★ 改成你的实际路径
    // return '/assets/index.js'

    // 或者自动找
    if (typeof document === 'undefined') return ''
    const scripts = document.querySelectorAll('script[src]')
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src
        if (src && (src.includes('/js/index'))) {
            return src
        }
    }
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src
        if (src && src.endsWith('.js')) return src
    }
    return ''
}

/**
 * 弹窗提示并刷新
 */
function showUpdateAlert(newHash) {
    // 用 uni.showModal（uni-app 风格）
    uni.showModal({
        title: '版本更新',
        content: '检测到新版本，是否立即刷新？',
        confirmText: '立即刷新',
        cancelText: '稍后',
        success: (res) => {
            if (res.confirm) {
                // ★ 强制刷新：URL 加时间戳，跳过缓存
                const baseUrl = window.location.href.split('?')[0]
                window.location.href = baseUrl + '?t=' + Date.now()
            } else {
                // 用户点稍后，不刷新，但 Worker 已停止，下次手动点关闭按钮才重载
            }
        }
    })
}

/**
 * 启动版本检查
 */
export function startVersionCheck(options = {}) {
    if (started) return
    if (typeof Worker === 'undefined') {
        console.warn('[versionCheck] Worker 不支持')
        return
    }

    try {
        // ★ 创建 Worker
        worker = new Worker('/static/version.worker.js')

        worker.onmessage = (e) => {
            const msg = e.data
            if (!msg) return

            if (msg.type === 'init') {
                console.log('[versionCheck] 首次 hash:', msg.hash)
            } else if (msg.type === 'changed') {
                console.log('[versionCheck] hash 变化:', msg.oldHash, '→', msg.newHash)
                showUpdateAlert(msg.newHash)
            }
        }

        worker.onerror = (e) => {
            console.error('[versionCheck] Worker 错误:', e)
        }

        // ★ 启动
        worker.postMessage({
            type: 'start',
            url: options.url || getEntryScriptUrl(),
            interval: options.interval || 60 * 1000
        })

        started = true
    } catch (e) {
        console.error('[versionCheck] 启动失败:', e)
    }
}

/**
 * 停止版本检查
 */
export function stopVersionCheck() {
    if (worker) {
        worker.postMessage({ type: 'stop' })
        worker.terminate()
        worker = null
    }
    started = false
}

/**
 * 手动触发一次检查
 */
export function checkVersionNow() {
    if (worker) {
        worker.postMessage({ type: 'checkNow' })
    }
}