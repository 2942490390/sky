<template>
    <Teleport to="body">
        <div v-if="visible" class="dialog-mask" @click.self="handleCancel">
            <div class="dialog-box">
                <div class="dialog-title">{{ title }}</div>

                <input v-if="type === 'prompt'" ref="inputRef" v-model="inputValue" class="dialog-input"
                    :focus="autoFocus" :placeholder="placeholder" @keyup.enter="handleConfirm" />

                <div class="dialog-footer">
                    <button @click="handleCancel" class="mini-btn">取消</button>
                    <button class="primary mini-btn" @click="handleConfirm">确定</button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue' 

const props = defineProps({
    title: { type: String, default: '提示' },
    type: { type: String, default: 'prompt' }, // prompt | confirm | alert
    defaultValue: { type: [String, Number], default: '' },
    placeholder: { type: String, default: '' },
    // 外部注入的回调，内部只负责调用，不负责卸载
    onResolve: { type: Function, required: true },
    onReject: { type: Function, required: true },
    immediateFocus: { type: Boolean, default: false },
})

const visible = ref(false)
const autoFocus = ref(false)
const inputRef = ref(null)
const inputValue = ref(
    props.defaultValue === null || props.defaultValue === undefined
        ? ''
        : String(props.defaultValue)
)

// 已结束标志，防止重复 resolve/reject
let settled = false

onMounted(() => {
    visible.value = true
    if (props.type === 'prompt' && props.immediateFocus) {
        // 用 nextTick 等 input 渲染进 DOM，然后直接 focus 原生元素
        nextTick(() => {
            // 注意：uni H5 下 <input> 可能被编译成 uni 组件，
            // 如果 inputRef 不是原生 DOM，尝试拿 $el
            const el = inputRef.value?.$el || inputRef.value
            if (el && typeof el.focus === 'function') {
                el.focus()
            }
            // 同时保留 :focus 属性作为兜底（某些环境下原生 focus 被拦截时 :focus 可能生效）
            autoFocus.value = true
        })
    }
})

function handleConfirm() {
    if (settled) return
    settled = true
    if (props.type === 'prompt') {
        props.onResolve(inputValue.value)
    } else {
        props.onResolve(true)
    }
}

function handleCancel() {
    if (settled) return
    settled = true
    if (props.type === 'confirm' || props.type === 'prompt') {
        props.onReject('cancel')
    } else {
        // alert 只有"知道了"，取消也当确认
        props.onResolve(undefined)
    }
}
</script>

<style scoped>
.dialog-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: fadeIn 0.2s;
}

.dialog-box {
    background: #fff;
    border-radius: 8px;
    padding: 6px;
    min-width: 320px;
    max-width: 90vw;
    animation: slideIn 0.2s;
}

.dialog-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
}

.dialog-input {
    width: 100%;
    min-height: 60px;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 16px;
    outline: none;
    box-sizing: border-box;
}

.dialog-input:focus {
    border-color: #409eff;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.dialog-footer button {
    padding: 6px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
}

.dialog-footer .primary {
    background: #409eff;
    color: #fff;
    border-color: #409eff;
}

@keyframes fadeIn {
    from {
        opacity: 0
    }

    to {
        opacity: 1
    }
}

@keyframes slideIn {
    from {
        transform: translateY(-20px)
    }

    to {
        transform: translateY(0)
    }
}

.mini-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 12px;
    font-size: 11px;
    cursor: pointer;
    line-height: 1;
}
</style>