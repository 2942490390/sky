// common/fileStreamReader.js
// H5 端流式读取 File 对象（uni.chooseFile 返回的 tempFile.file）

/**
 * 流式读取 File 内容（分片，带进度，异步）
 * @param {File} file - 浏览器原生 File 对象
 * @param {Function} onProgress - (readBytes, totalBytes) => void
 * @param {number} chunkSize - 每片字节数，默认 64KB
 * @returns {Promise<string>}
 */
export function readFileStream(file, onProgress, chunkSize = 64 * 1024) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('file 为空'))
            return
        }

        const total = file.size || 0

        // ========== 优先用 File.stream() + TextDecoder（真流式） ==========
        if (typeof file.stream === 'function' && typeof TextDecoder !== 'undefined') {
            const reader = file.stream().getReader()
            const decoder = new TextDecoder('utf-8')
            let text = ''
            let read = 0

            function pump() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        // flush 尾部残留
                        text += decoder.decode()
                        if (onProgress) onProgress(read, total || read)
                        resolve(text)
                        return
                    }
                    read += value.byteLength
                    text += decoder.decode(value, { stream: true })
                    if (onProgress) onProgress(read, total || read)
                    pump()
                }).catch(reject)
            }
            pump()
            return
        }

        // ========== 降级：FileReader + slice 分片 ==========
        const reader = new FileReader()
        let offset = 0
        let text = ''

        reader.onload = (e) => {
            text += e.target.result
            offset += chunkSize
            if (onProgress) onProgress(Math.min(offset, total), total)
            if (offset < total) {
                readNext()
            } else {
                resolve(text)
            }
        }
        reader.onerror = () => reject(reader.error || new Error('FileReader error'))

        function readNext() {
            const slice = file.slice(offset, Math.min(offset + chunkSize, total))
            reader.readAsText(slice, 'utf-8')
        }
        readNext()
    })
}

/**
 * 用 FileReader.readAsArrayBuffer 一次性读（小文件兜底）
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error || new Error('FileReader error'))
        reader.readAsArrayBuffer(file)
    })
}

/**
 * 从 uni.chooseFile 返回的 tempFile 中提取 File 对象
 * 兼容不同 uni-app 版本
 * @param {Object} tempFile
 * @returns {File|null}
 */
export function extractFile(tempFile) {
    if (!tempFile) return null

    // 原生 input 直接返回 File；不要依赖 instanceof，跨 iframe 时可能失败
    const isFileLike = (value) => value && typeof value === 'object' &&
        typeof value.size === 'number' && typeof value.slice === 'function' &&
        typeof value.name === 'string'
    if (isFileLike(tempFile)) return tempFile

    // 标准路径：tempFile.file 就是 File
    if (isFileLike(tempFile.file)) return tempFile.file

    // 有些版本放在 tempFile.raw
    if (isFileLike(tempFile.raw)) return tempFile.raw

    // 某些浏览器/组件使用 originFileObj 包装原生 File
    if (isFileLike(tempFile.originFileObj)) return tempFile.originFileObj

    // 有些版本只有 path (blob:)，需要异步 fetch 回来
    // 这种情况返回 null，调用方走 fetch(path) 分支
    return null
}