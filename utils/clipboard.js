// utils/clipboard.js
// 统一复制工具：优先同步 execCommand（兼容 H5GG / file:// / WebView），
// clipboard API 仅作 HTTPS 环境兜底。

export function copyText(text) {
    if (typeof text !== 'string') {
        if (text === null || text === undefined) return Promise.reject(new Error('empty'))
        text = String(text)
    }
    if (!text.trim()) return Promise.reject(new Error('empty'))

    // 1) 同步 execCommand（必须同步调用，不能放进 then/setTimeout）
    if (tryExecCommand(text)) {
        return Promise.resolve(true)
    }

    // 2) HTTPS 安全上下文下用 clipboard API 兜底
    if (typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof window !== 'undefined' &&
        window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(() => true)
    }

    return Promise.reject(new Error('copy failed'))
}

function tryExecCommand(text) {
    try {
        if (typeof document === 'undefined' || !document.body) return false
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        ta.style.opacity = '0'
        document.body.appendChild(ta)

        // iOS 需要 focus + select + setSelectionRange
        ta.focus()
        ta.select()
        ta.setSelectionRange(0, text.length)

        let ok = false
        try {
            ok = document.execCommand('copy')
        } catch (e) {
            ok = false
        }
        document.body.removeChild(ta)
        return ok
    } catch (e) {
        return false
    }
}

// 带 toast 的便捷封装（uni 环境）
export function copyWithToast(text, okMsg = '已复制') {
    return copyText(text)
        .then(() => {
            if (typeof uni !== 'undefined' && uni.showToast) {
                uni.showToast({ title: okMsg, icon: 'success', duration: 1000 })
            }
            return true
        })
        .catch(() => {
            if (typeof uni !== 'undefined' && uni.showToast) {
                uni.showToast({ title: '复制失败', icon: 'none' })
            }
            return false
        })
}