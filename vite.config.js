// vite.config.js
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { resolve } from 'path'

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      // 你的项目没有 src，所以 '@' 指向根目录（'.'）
      '@': resolve(__dirname, '.')
    }
  },
  build: {
    cssCodeSplit: false, // 关键：所有 CSS 合并为一个文件
    rollupOptions: {
      output: {
        // JS 入口文件放入 js/ 目录
        entryFileNames: 'js/[name].[hash].js',
        // JS 分包文件放入 js/ 目录
        chunkFileNames: 'js/chunk-[name].[hash].js',
        // CSS 等其他资源按类型分目录
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          // CSS 文件放入 css/ 目录
          if (name.endsWith('.css')) {
            return 'css/[name].[hash][extname]'
          }
          // 图片放入 images/ 目录
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) {
            return 'images/[name].[hash][extname]'
          }
          // 字体等其他资源放入 assets/ 目录
          return 'assets/[name].[hash][extname]'
        }
      }
    }
  }
})