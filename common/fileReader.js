// common/fileReader.js
// h5gg 环境下读取本地文件（支持 file:// 路径），分片读取

/**
 * 读取文件内容（分片，异步，带进度）
 * @param {string} filePath   h5gg.pickScriptFile 返回的路径，如 /var/.../xxx.txt
 * @param {function} onProgress (readBytes, totalBytes) => void
 * @returns {Promise<string>}
 */
export function readFileByPath(filePath, onProgress) {
	return new Promise((resolve, reject) => {
		// 补全 file:// 协议
		let url = filePath
		if (!/^\w+:\/\//.test(url)) {
			url = 'file://' + url
		}

		// 优先用 fetch（h5gg WebView 通常支持 file:// 的 fetch）
		if (typeof fetch === 'function') {
			fetch(url)
				.then(resp => {
					if (!resp.ok) throw new Error('HTTP ' + resp.status)
					const total = Number(resp.headers.get('Content-Length')) || 0
					// 若无 stream 支持，直接 text
					if (!resp.body || typeof resp.body.getReader !== 'function') {
						return resp.text()
					}
					// 分片读取（stream）
					const reader = resp.body.getReader()
					const decoder = new TextDecoder('utf-8')
					let text = ''
					let read = 0
					function pump() {
						return reader.read().then(({ done, value }) => {
							if (done) return text
							text += decoder.decode(value, { stream: true })
							read += value.length
							if (onProgress) onProgress(read, total || read)
							return pump()
						})
					}
					return pump()
				})
				.then(text => resolve(text))
				.catch(err => {
					// fetch 失败 → 退回 XHR
					xhrRead(url, onProgress).then(resolve).catch(reject)
				})
			return
		}

		// 无 fetch → 直接 XHR
		xhrRead(url, onProgress).then(resolve).catch(reject)
	})
}

/**
 * XHR 兜底读取
 */
function xhrRead(url, onProgress) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', url, true)
		xhr.responseType = 'text'
		xhr.onprogress = (e) => {
			if (onProgress && e.lengthComputable) {
				onProgress(e.loaded, e.total)
			}
		}
		xhr.onload = () => {
			if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
				resolve(xhr.responseText)
			} else {
				reject(new Error('XHR status ' + xhr.status))
			}
		}
		xhr.onerror = () => reject(new Error('XHR error'))
		xhr.send()
	})
}