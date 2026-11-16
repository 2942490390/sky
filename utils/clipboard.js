// utils/clipboard.js
// 终极兜底版：API 失败时弹出优雅的手动复制面板

export function copyText(text) {
    if (typeof text !== 'string') {
        if (text === null || text === undefined) return Promise.reject(new Error('empty'))
        text = String(text)
    }
    if (!text.trim()) return Promise.reject(new Error('empty'))

    // 1. 尝试原生 API
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        try {
            const p = navigator.clipboard.writeText(text)
            if (p) {
                return p.then(() => true).catch(() => showManualCopyFallback(text))
            }
        } catch (e) { }
    }

    // 2. 尝试 execCommand
    if (tryExecCommand(text)) {
        return Promise.resolve(true)
    }

    // 3. 尝试 uni API（非 H5 或兜底）
    if (typeof uni !== 'undefined' && typeof uni.setClipboardData === 'function') {
        return new Promise((resolve, reject) => {
            uni.setClipboardData({
                data: text,
                showToast: false,
                success: () => resolve(true),
                fail: () => showManualCopyFallback(text)
            })
        })
    }

    // 4. 全部失败，弹出手动复制兜底
    return showManualCopyFallback(text)
}

// 手动复制兜底 UI
function showManualCopyFallback(text) {
    if (typeof document === 'undefined' || !document.body) {
        return Promise.reject(new Error('无法弹出手动复制'))
    }

    return new Promise((resolve) => {
        // 创建遮罩
        const mask = document.createElement('div')
        mask.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); z-index: 999999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 20px; box-sizing: border-box;
            backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        `

        // 创建内容框
        const box = document.createElement('div')
        box.style.cssText = `
            background: #fff; border-radius: 12px; padding: 16px;
            width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `

        // 提示文字
        const title = document.createElement('div')
        title.textContent = '请长按下方文本框选择复制'
        title.style.cssText = 'font-size: 14px; font-weight: bold; color: #333; text-align: center;'

        // 输入框：只读，不自动 focus，防弹键盘
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.cssText = `
            width: 100%; height: 100px; padding: 10px; box-sizing: border-box;
            border: 1px solid #ccc; border-radius: 8px; font-size: 12px;
            font-family: monospace; color: #333; background: #f8f9fa;
            resize: none; outline: none; -webkit-user-select: text; user-select: text;
            word-break: break-all;
        `

        // 按钮容器
        const btnRow = document.createElement('div')
        btnRow.style.cssText = 'display: flex; gap: 8px;'

        // 点击全选按钮
        const selectBtn = document.createElement('button')
        selectBtn.textContent = '点击全选'
        selectBtn.style.cssText = `
            flex: 1; padding: 10px; background: #eef1f6; border: 1px solid #d1d5db;
            border-radius: 8px; font-size: 14px; font-weight: bold; color: #4b5563;
            cursor: pointer; -webkit-appearance: none; outline: none;
        `
        selectBtn.onclick = () => {
            // 点击时才 focus 并全选，触发系统的复制气泡
            ta.focus()
            ta.setSelectionRange(0, text.length)
            selectBtn.textContent = '已全选'
            selectBtn.style.background = '#d1fae5'
            selectBtn.style.color = '#065f46'
            selectBtn.style.borderColor = '#34d399'
            setTimeout(() => {
                selectBtn.textContent = '点击全选'
                selectBtn.style.background = '#eef1f6'
                selectBtn.style.color = '#4b5563'
                selectBtn.style.borderColor = '#d1d5db'
            }, 2000)
        }

        // 关闭按钮
        const closeBtn = document.createElement('button')
        closeBtn.textContent = '关闭'
        closeBtn.style.cssText = `
            flex: 1; padding: 10px; background: #FFD966; border: none;
            border-radius: 8px; font-size: 14px; font-weight: bold; color: #4a3b1f;
            cursor: pointer; -webkit-appearance: none; outline: none;
        `

        // 关闭逻辑
        let clicked = false
        const close = () => {
            if (clicked) return
            clicked = true
            document.body.removeChild(mask)
            resolve(true) // 视为已处理
        }
        closeBtn.onclick = close
        mask.onclick = (e) => {
            if (e.target === mask) close()
        }

        // 组装并添加到页面
        btnRow.appendChild(selectBtn)
        btnRow.appendChild(closeBtn)
        box.appendChild(title)
        box.appendChild(ta)
        box.appendChild(btnRow)
        mask.appendChild(box)
        document.body.appendChild(mask)
    })
}

// 原生 execCommand
function tryExecCommand(text) {
    try {
        if (typeof document === 'undefined' || !document.body) return false
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '0'
        ta.style.left = '0'
        ta.style.width = '1px'
        ta.style.height = '1px'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.setSelectionRange(0, text.length)
        let ok = false
        try {
            ok = document.execCommand('copy')
        } catch (e) { }
        document.body.removeChild(ta)
        return ok
    } catch (e) {
        return false
    }
}

// 带 toast 封装（原接口不变）
export function copyWithToast(text, _okMsg = '已复制') {
    return copyText(text)
        .then(res => res)
        .catch(() => {
            if (typeof uni !== 'undefined' && uni.showToast) {
                uni.showToast({ title: '复制失败', icon: 'none' })
            }
            return false
        })
}