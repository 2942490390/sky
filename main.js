import App from './App'
// import VConsole from 'vconsole'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	return {
		app
	}
}
// #endif

// 判断是否是pc设备
const isPc = () => {
	const userAgentInfo = navigator.userAgent
	const Agents = ["Android", "iPhone",
		"SymbianOS", "Windows Phone",
		"iPad", "iPod"
	];
	let flag = true
	for (let v = 0; v < Agents.length; v++) {
		if (userAgentInfo.indexOf(Agents[v]) > 0) {
			flag = false
			break
		}
	}
	return flag
}

// #ifdef H5
//如果不是生产环境并且不是pc设备那么就显示调试
if (process.env.NODE_ENV != "prod" && !isPc()) {
	import('vconsole').then(m => {
		new m.default()
	})
}


// if (process.env.NODE_ENV === 'development') {
//     // 只在开发环境引入 vconsole，生产环境不打包
//     import('vconsole').then(m => {
//         new m.default()
//     })
// }

// import('vconsole').then(m => {
//        new m.default()
//    })
// #endif