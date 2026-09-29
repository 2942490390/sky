# Sky

Sky 是一款基于 uni-app 框架开发的多平台工具应用，支持 iOS 平台。该应用主要用于游戏辅助功能，包括指针链配置、游戏数据修改等功能。

## 项目结构

```
sky/
├── App.vue                 # 应用主组件
├── common/                 # 公共功能模块
│   ├── autoRunPoints.js    # 自动运行点位功能
│   ├── coordRunner.js      # 坐标运行器
│   ├── energyShield.js     # 能量护盾功能
│   ├── fileReader.js       # 文件读取器
│   ├── fileStreamReader.js # 文件流读取器
│   ├── functionLabels.js   # 功能标签
│   ├── gestureBlocker.js   # 手势拦截器
│   ├── getPoint.js         # 获取点位
│   ├── h5gg.js             # H5GG 核心功能
│   ├── interactionWatchdog.js # 交互监控
│   ├── lockHeight.js       # 高度锁定
│   ├── offsets.config.js   # 偏移配置
│   ├── offsetsStore.js     # 偏移存储
│   ├── pointerImporter.js  # 指针导入器
│   ├── responsiveChecker.js # 响应式检查
│   ├── tapOnly.js          # 仅点击功能
│   ├── useReload.js        # 重载功能
│   ├── versionCheck.js     # 版本检查
│   └── windowLayout.js     # 窗口布局
├── components/             # 组件目录
│   ├── NavBar.vue          # 导航栏组件
│   ├── PageChuanSong.vue   # 传送页面
│   ├── PageDaiRen.vue     # 代理页面
│   ├── PageHome.vue        # 首页
│   ├── PageSettings.vue    # 设置页面
│   ├── PageShiYong.vue     # 使用页面
│   ├── PageYuLe.vue       # 娱乐页面
│   ├── PageYuanDi.vue     # 原地页面
│   └── PointerChainSearch.vue # 指针链搜索
├── index.html              # HTML 入口文件
├── jsconfig.json           # JavaScript 配置
├── main.js                 # 应用入口文件
├── manifest.json           # 应用配置清单
├── package.json            # 项目依赖
├── pages/                  # 页面目录
│   └── index/
│       └── index.vue       # 首页组件
├── static/                 # 静态资源
│   ├── lb1_31c85a23.png   # 图片资源
│   ├── lb2_e91841cd.png   # 图片资源
│   ├── lb3_4f5edaf6.png   # 图片资源
│   ├── lb4_577ed5e7.png   # 图片资源
│   ├── lb5_d93f0206.png   # 图片资源
│   ├── logo.png           # Logo 图片
│   ├── vconsole.min.js    # 移动端调试工具
│   └── version.worker.js   # 版本检测 Worker
├── uni.promisify.adaptor.js # Promise 适配器
├── uni.scss               # 样式文件
└── vite.config.js         # Vite 构建配置
```

## 功能特点

### 核心功能
- **指针链配置**: 支持多级指针链配置和修改
- **游戏数据修改**: 基于 H5GG 的游戏数据读取和修改
- **坐标运行器**: 支持坐标自动运行和点击
- **能量护盾**: 游戏保护功能
- **版本检测**: 自动检测和更新应用版本

### 辅助功能
- **手势拦截**: 防止误触和手势干扰
- **响应式检查**: 自适应不同屏幕尺寸
- **文件读取**: 支持游戏数据文件读取
- **仅点击模式**: 限制为仅点击操作

## 技术栈

- **框架**: uni-app (Vue 3)
- **构建工具**: Vite
- **调试工具**: vconsole (移动端)
- **平台支持**: H5、Android、iOS、小程序等

## 开发环境要求

- Node.js
- npm 或 yarn
- HBuilderX (可选，用于uni-app开发)

## 安装与运行

1. 克隆项目
```bash
git clone [项目地址]
```

2. 安装依赖
```bash
npm install
```

3. 运行项目
```bash
# 开发模式
npm run dev

# 打包
npm run build
```

## 配置说明

### 应用配置
- 应用名称: Sky
- 应用ID: __UNI__154CCB3
- 版本: 1.0.0
- 平台支持: H5、Android、iOS、微信小程序等

### 构建配置
- 使用 Vite 作为构建工具
- CSS 代码合并为一个文件
- 资源按类型分类存放
- 支持 @ 别名指向项目根目录

## 注意事项

- 本项目仅用于学习和研究目的，请勿用于非法用途
- 在使用游戏修改功能时，请注意游戏规则和用户协议
- 应用在 H5 环境下会自动检测是否为 H5GG 环境，未检测到会提示用户

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。
