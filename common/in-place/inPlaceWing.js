// common/in-place/inPlaceWing.js
// 原地光翼核心：指针链用 h5gg.js 的 getPtr，地址注册用 addressRegistry 的 setAddr

import { getPtr, writeSafe, customDelay } from '@/common/h5gg.js'
import { setAddr } from '@/common/addressRegistry.js'
import { flattenWings } from './wingData.js'

// ============ 运行状态（模块级，供停止用） ============
let _running = false

export function isInPlaceWingRunning() {
    return _running
}

export function stopInPlaceWing() {
    const was = _running
    _running = false
    return was
}

// ============ 单个光翼写入 ============
/**
 * 往原地光翼结构体写入一个光翼名
 */
function writeOneWing(addr, wingName) {
    const bytes = []
    for (let i = 0; i < wingName.length; i++) bytes.push(wingName.charCodeAt(i))

    writeSafe(addr, 257, 'I32')
    for (let v = 0; v < 32; v++) {
        writeSafe(addr + 16 + v, bytes[v] || 0, 'I8')
    }
    writeSafe(addr + 88, 8, 'I32')
    writeSafe(addr + 136, 65793, 'I32')
}

// ============ 主流程 ============
/**
 * 开始原地光翼
 * @param {Object} opts
 * @param {number} [opts.delaySec=50]  每个光翼写入间隔（秒）
 * @param {(msg:string)=>void} [opts.onProgress]  进度回调（可选）
 * @param {() => boolean} [opts.isCancelled]  取消检测（可选，默认用内部 _running）
 * @returns {Promise<{ok:boolean, reason:string, written:number, total:number}>}
 */
export async function startInPlaceWing(opts = {}) {
    if (_running) {
        return { ok: false, reason: 'already-running', written: 0, total: 0 }
    }

    const delaySec = Number(opts.delaySec) > 0 ? Number(opts.delaySec) : 50
    const delayMs = delaySec * 1000
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
    const isCancelled = typeof opts.isCancelled === 'function'
        ? opts.isCancelled
        : () => !_running

    _running = true

    // 1. 拿指针链地址
    let addr = 0
    try {
        addr = await getPtr('insituWing')
    } catch (e) {
        addr = 0
    }

    if (!addr || addr <= 0) {
        _running = false
        return { ok: false, reason: 'ptr-failed', written: 0, total: 0 }
    }

    // 2. 同步注册地址
    setAddr('insituWing', addr, { type: 'BASE', note: '原地光翼结构体' })

    const list = flattenWings()
    const total = list.length
    let written = 0
    let lastMapName = ''

    try {
        for (let i = 0; i < total; i++) {
            if (isCancelled()) {
                return { ok: false, reason: 'cancelled', written, total }
            }

            const item = list[i]

            // 换地图时提示一次
            if (item.mapName !== lastMapName) {
                lastMapName = item.mapName
                if (onProgress) onProgress(`地图：${item.mapName}`)
            }

            if (onProgress) onProgress(item.wingName)

            // 先等，再写（和原 HTML 顺序一致）
            await customDelay(delayMs)

            if (isCancelled()) {
                return { ok: false, reason: 'cancelled', written, total }
            }

            writeOneWing(addr, item.wingName)
            written++
        }
    } finally {
        _running = false
    }

    return { ok: true, reason: 'done', written, total }
}
