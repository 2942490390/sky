# Sky 项目说明

## 项目概述

Sky 是一个使用 uni-app 和 Vue 3 构建的多平台交互式工具应用，代码包含游戏辅助界面、指针链配置与搜索、坐标相关操作、地图功能，以及运行时交互诊断等模块。应用以 `pages/index/index.vue` 为主界面，通过公共逻辑模块调用 H5GG 环境接口；部分功能依赖特定运行环境，不能仅凭普通浏览器确认可用。

## 技术栈

- **语言：** JavaScript、Vue 单文件组件、HTML、CSS / SCSS。
- **框架与构建：** uni-app、Vue 3、Vite；`vite.config.js` 配置了 `@dcloudio/vite-plugin-uni`。
- **主要运行时依赖：** H5GG（由运行环境提供）、uni-app API、Vue 3。
- **其他依赖：** `vconsole`，用于移动端开发调试。

## 项目结构

```text
.
├── App.vue                    # 应用生命周期、窗口布局、交互诊断与 H5 运行时检查
├── App.css                    # 全局应用样式
├── main.js                    # uni-app / Vue 应用入口
├── pages.json                 # 页面路由和平台样式配置
├── manifest.json              # uni-app 应用及平台配置
├── vite.config.js              # Vite、uni-app 插件、资源输出配置
├── common/
│   ├── h5gg.js                 # H5GG 兼容入口、指针解析与功能模块统一导出
│   ├── addressRegistry.js      # 运行时地址注册表、分组元信息与值刷新
│   ├── offsets.config.js       # 默认指针链配置
│   ├── offsetsStore.js         # 指针链配置的加载、持久化、导入状态管理
│   ├── pointerImporter.js      # 指针链文本解析、校验和稳定性筛选
│   ├── coordRunner.js          # 坐标读取、编辑与自动跑图调度
│   ├── autoRunPoints.js        # 自动跑图点位数据
│   ├── features/
│   │   ├── energy.js            # 能量、烟花和全局加速逻辑
│   │   ├── burnBloom.js         # 自燃、炸花、吸火和蜡烛显示逻辑
│   │   ├── wing.js              # 光翼、高度、发光和跳跃相关逻辑
│   │   ├── warp.js              # 地图核心、传送与任意门逻辑
│   │   └── index.js             # 功能模块缓存统一清理
│   ├── map/
│   │   └── warpSpots.js         # 地图和可传送点数据
│   ├── versionCheck.js          # Worker 版本检查的主线程控制
│   ├── responsiveChecker.js     # 页面响应检测及恢复处理
│   ├── interactionWatchdog.js   # 触摸命中诊断与交互层故障回调
│   ├── gestureBlocker.js        # 双击、右键菜单等手势拦截
│   ├── tapOnly.js               # 单击识别与合成 click 处理
│   └── windowLayout.js          # H5GG 窗口尺寸、方向与拖动区域设置
├── pages/
│   └── index/index.vue          # 页面容器：导航、页面切换、尺寸缩放
├── components/
│   ├── NavBar.vue               # 侧边导航
│   ├── PageHome.vue             # 首页和面板缩放 UI
│   ├── PageYuanDi.vue           # 原地功能入口
│   ├── PageShiYong.vue          # 坐标、跑图及常用功能入口
│   ├── PageYuLe.vue             # 娱乐功能分组入口
│   ├── PageChuanSong.vue        # 地图列表与传送点 UI
│   ├── PageDaiRen.vue           # 带人功能入口
│   ├── PageSettings.vue         # 指针链配置、导入和开发者监控入口
│   ├── PageDevMonitor.vue       # 地址注册表的搜索、分组与实时值监控
│   ├── PointerChainSearch.vue   # 指针链搜索、解析、校验和本地标识管理
│   ├── PromptDialog.vue         # 自定义输入 / 确认弹窗
│   ├── utilComponent/
│   │   └── NearbyScan.vue       # 指针搜索页面使用的邻近扫描界面
│   └── yule/
│       ├── RoleGroup.vue        # 角色相关功能组件
│       ├── EngineGroup.vue      # 场景、引擎相关功能组件
│       ├── AbilityGroup.vue     # 能力与任务相关功能组件
│       └── base.css             # 娱乐分组共用样式
├── utils/
│   ├── usePrompt.js             # 以 Promise 方式调用自定义弹窗
│   └── toast.js                 # 自定义多行 toast 与降级实现
└── static/
    ├── 1.png ... 5.png          # 首页轮播图
    ├── logo.png                 # 图标资源
    └── version.worker.js        # 后台版本检查 Worker
```

## 重要模块说明

### 1. 应用入口与页面容器

- `main.js`：创建 uni-app 应用实例；H5 开发环境下按设备类型动态加载 `vconsole`。
- `App.vue`：应用级生命周期管理。挂载时初始化窗口布局，并在 H5 环境启动版本检查和响应检测；同时安装交互看门狗、手势拦截和单击处理，并处理输入框键盘弹出时的页面滚动。
- `pages.json`：声明唯一主页面 `pages/index/index`，并配置各平台的导航和软键盘行为。
- `pages/index/index.vue`：应用的主要 UI 容器。将 `NavBar` 与各功能页组合，通过 `activeNav` 控制显示，并调用页面组件的 `activate()` / `deactivate()` 控制页面进入和离开时的任务。

**页面切换关系：** `NavBar.vue` 发出导航索引，`pages/index/index.vue` 更新当前页面并调用页面生命周期方法。功能页再调用 `common/` 下的逻辑模块。

### 2. 功能页面与组件

- `PageHome.vue`：展示轮播资源、任务进度和面板缩放控件；缩放值通过事件交回页面容器。
- `PageShiYong.vue`：提供坐标查看与编辑、自动跑图、速度控制和若干开关入口；协调 `coordRunner.js`、`h5gg.js` 与高度锁定模块，并在离开时停止部分循环任务。
- `PageChuanSong.vue`：展示地图和传送点列表，读取 `common/map/warpSpots.js` 的数据，并调用 `common/features/warp.js` 执行传送及结果检查。
- `PageYuLe.vue`：把娱乐功能按角色、引擎、能力分组，具体 UI 分别由 `components/yule/` 下组件实现。
- `PageSettings.vue`：提供指针链配置的增删改、导入、导出、重置和保存入口，也可打开开发者监控。
- `PointerChainSearch.vue`：承担指针链搜索工作流，包括搜索参数、分段处理、虚拟滚动日志、主模块过滤、结果解析、本地标识存储和链校验；邻近扫描通过异步组件加载。
- `PageDevMonitor.vue`：读取 `addressRegistry.js` 中的分组地址条目，支持搜索、有效性过滤、复制地址，并定时刷新内存值。
- `PageYuanDi.vue` 和 `PageDaiRen.vue`：当前包含部分任务入口；其中若干处理函数目前只输出日志，不能据页面按钮名称推断为已实现的完整功能。

### 3. H5GG 与地址配置

- `common/h5gg.js` 是公共访问入口：提供主模块缓存、指针链读取、`writeSafe()` 等辅助方法，并重新导出 `features/` 的功能 API。
- `common/offsets.config.js` 保存默认的功能键、基址偏移和多级偏移链。
- `common/offsetsStore.js` 负责默认配置与本地配置的读取、保存、重置、导出，以及默认配置版本状态判断。
- `common/pointerImporter.js` 解析多种指针链文本格式，提供转换、链有效性验证和稳定链筛选。
- `common/addressRegistry.js` 维护运行时地址、类型、标签、分组、有效状态和值历史；`PageDevMonitor.vue` 使用该注册表展示地址状态。

**配置变更路径：** 设置页读取 `offsetsStore.js` 数据并展示；保存或导入后清理 `h5gg.js` 及功能模块的地址缓存，使后续读取重新使用当前配置。

### 4. 功能逻辑模块

- `common/coordRunner.js`：读取和缓存坐标地址，校验缓存有效性，支持单轴坐标设置、整组坐标更新与定时轮询；自动跑图按顺序消费 `autoRunPoints.js` 中的点位。
- `common/features/energy.js`：封装能量、烟花与速度相关的循环和地址缓存。
- `common/features/burnBloom.js`：封装自燃、炸花、吸火、隐藏蜡烛相关逻辑。
- `common/features/wing.js`：封装光翼、高度、人物发光、跳跃等操作。
- `common/features/warp.js`：包含地图核心初始化、地图数据查找、传送处理及任意门相关状态；`common/map/warpSpots.js` 提供界面使用的地图和点位数据。
- `common/features/index.js`：集中清理各功能模块持有的地址缓存。
- `common/energyShield.js`、`common/scene.js`、`common/entertainment.js`、`common/packetSender.js` 等公共模块还承载其他功能逻辑；对应界面主要分布在 `PageShiYong.vue` 和 `components/yule/`。

### 5. 运行时健壮性与交互辅助

- `common/windowLayout.js`：计算并应用窗口尺寸，在支持相关 API 的环境中设置窗口位置、可拖动区域和方向变化处理。
- `common/responsiveChecker.js`：使用心跳和交互后的帧响应检测页面卡顿，并提供带冷却的页面刷新处理。
- `common/versionCheck.js` 与 `static/version.worker.js`：由 Worker 获取入口脚本并比较内容 hash；发现变化后通知主线程提示刷新。
- `common/interactionWatchdog.js`：记录触摸、点击和命中位置诊断信息；在疑似点击落点错位时回调应用层处理。
- `common/gestureBlocker.js` 与 `common/tapOnly.js`：集中处理移动端手势和单击行为；`index.html` 另配置了文本选择、长按菜单和触摸高亮样式。
- `utils/usePrompt.js` 与 `components/PromptDialog.vue`：创建 Promise 风格的自定义弹窗；`utils/toast.js` 提供多行提示及不支持 DOM 时的降级。

## 运行与构建

### 当前配置情况

仓库当前的 `package.json` 只声明了 `vconsole` 依赖，没有定义 `scripts`，也没有声明 `vite`、`@dcloudio/vite-plugin-uni` 等构建依赖。因此，仓库 README 中提到的 `npm run dev` 和 `npm run build` **无法从当前 `package.json` 得到支持**；仅运行 `npm install` 不能据此确认项目可构建。

`vite.config.js` 确实引用了 uni-app Vite 插件，但项目清单没有提供对应脚本和依赖版本。运行前需要先确认项目预期使用的 uni-app / HBuilderX 工程配置，并补齐或恢复匹配的依赖和脚本。

### 配置补齐后

```bash
npm install
# 只有在 package.json 定义了对应脚本后，才能运行：
npm run dev
npm run build
```

仓库当前未配置可确认的测试命令。H5GG 相关功能还需要相应的 H5GG 运行环境；普通浏览器环境不能验证这些功能的实际效果。

## 配置与维护提示

- 应用平台配置位于 `manifest.json`；页面路由位于 `pages.json`。
- 修改默认指针链时，应同步检查 `offsets.config.js`、`functionLabels.js` 和地址元信息 `addressRegistry.js`。
- 修改传送点时，检查 `common/map/warpSpots.js` 与 `PageChuanSong.vue` 使用的数据字段。
- 修改地址读写功能时，检查地址类型、缓存失效和 `clearFeatureCaches()` 的清理路径。
- 检查 README 时应以当前目录和代码为准：例如首页当前引用 `static/1.png` 至 `static/5.png`，与 README 中列出的 `lb*.png` 文件名不一致。
- 对依赖外部运行时、固定偏移或特征值的功能，应单独验证环境和配置是否匹配；不要仅凭 UI 文案判断其可用状态。
