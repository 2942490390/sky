// utils/toast.js
// 自定义多行 toast，替代 uni.showToast
// 支持：\n 换行、自动消失、App/H5 端 DOM 渲染、小程序端降级

let _timer = null
let _el = null

function ensureEl() {
	// #ifdef APP-PLUS || H5
	if (_el) return _el
	try {
		_el = document.createElement('div')
		_el.id = '__custom_toast__'
		_el.style.cssText = [
			'position:fixed',
			'left:50%',
			'top:50%',
			'transform:translate(-50%,-50%)',
			'background:rgba(0,0,0,0.85)',
			'color:#fff',
			'padding:12px 20px',
			'border-radius:10px',
			'font-size:14px',
			'line-height:1.6',
			'white-space:pre-wrap',
			'word-break:break-all',
			'max-width:80vw',
			'text-align:center',
			'z-index:999999',
			'opacity:0',
			'transition:opacity .2s',
			'pointer-events:none'
		].join(';')
		document.body.appendChild(_el)
	} catch (e) {
		_el = null
	}
	// #endif
	return _el
}

export function showToast(msg, duration = 2000) {
	const text = String(msg)

	// #ifdef APP-PLUS || H5
	const el = ensureEl()
	if (el) {
		el.textContent = text
		el.style.opacity = '1'
		if (_timer) clearTimeout(_timer)
		_timer = setTimeout(() => {
			el.style.opacity = '0'
		}, duration)
		return
	}
	// #endif

	// 降级
	uni.showToast({ icon: 'none', title: text, duration })
}