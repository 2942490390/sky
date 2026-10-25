import { createVNode, render } from 'vue'
import PromptDialog from '@/components/PromptDialog.vue'

function createDialog(options) {
    return new Promise((resolve, reject) => {
        const container = document.createElement('div')
        document.body.appendChild(container)

        let destroyed = false
        const destroy = () => {
            if (destroyed) return
            destroyed = true
            // 下一帧再卸载，让淡出动画能走完
            setTimeout(() => {
                render(null, container)
                if (container.parentNode) container.remove()
            }, 220)
        }

        const onResolve = (val) => {
            resolve(val)
            destroy()
        }
        const onReject = (val) => {
            reject(val)
            destroy()
        }

        const vnode = createVNode(PromptDialog, {
            ...options,
            onResolve,
            onReject,
        })

        render(vnode, container)
    })
}

export function usePrompt(options = {}) {
    return createDialog({ type: 'prompt', immediateFocus: true, ...options })
}

export function useConfirm(options = {}) {
    return createDialog({ type: 'confirm', ...options })
}

export function useAlert(options = {}) {
    return createDialog({ type: 'alert', ...options })
}