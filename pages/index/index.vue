<template>
  <view class="container" :key="reloadKey">
    <!-- 外层：fixed 铺满视口，flex 居中，负责"居中" -->
    <view class="glass-panel">
      <!-- 内层：真正面板，负责"尺寸 + 缩放 + 视觉" -->
      <view class="glass-inner" :style="{ transform: `scale(${scaleValue})` }">
        <i ref="reloadIcon" @click="onReloadClick" class="fa-regular fa-circle-xmark reload-icon"
           :class="{ 'fa-spin': reloading }"/>
        <NavBar :active-index="activeNav" @change="switchPage"/>
        <view class="vertical-divider"></view>
        <view class="right-container">
          <PageHome v-show="activeNav === 0" :progress-total="progressTotal"
                    :progress-current="progressCurrent" :current-map-name="currentMapName"
                    :scale-slider-value="scaleSliderValue" @update-scale="onScaleChange"/>

          <component v-for="(item, index) in otherPages" :key="item.key" :is="item.component"
                     :ref="el => setPageRef(item.key, el)" v-show="activeNav === index + 1"/>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import {nextTick, onMounted, ref} from 'vue'
import NavBar from '@/components/NavBar.vue'
import PageHome from '@/components/PageHome.vue'
import PageYuanDi from '@/components/PageYuanDi.vue'
import PageShiYong from '@/components/PageShiYong.vue'
import PageYuLe from '@/components/PageYuLe.vue'
import PageChuanSong from '@/components/PageChuanSong.vue'
import PageDaiRen from '@/components/PageDaiRen.vue'
import PointerChainSearch from '@/components/PointerChainSearch.vue'
import PageSettings from '@/components/PageSettings.vue'
import {useReload} from '@/common/useReload.js'

const otherPages = [{
  key: 'yuandi',
  component: PageYuanDi
},
  {
    key: 'shiyong',
    component: PageShiYong
  },
  {
    key: 'yule',
    component: PageYuLe
  },
  {
    key: 'chuansong',
    component: PageChuanSong
  },
  {
    key: 'dairen',
    component: PageDaiRen
  },
  {
    key: 'pointer',
    component: PointerChainSearch
  },
  {
    key: 'settings',
    component: PageSettings
  }
]


// ★ 动态 ref 容器
const pageRefs = {}

const activeNav = ref(0)

function setPageRef(key, el) {
  if (el) pageRefs[key] = el
  else delete pageRefs[key]
}

// 从 activeNav 拿到 key
function keyOfNav(index) {
  if (index === 0) return null
  return otherPages[index - 1]?.key ?? null
}

// 激活/停用某页
function setPageActive(index, on) {
  const key = keyOfNav(index)
  if (!key) return
  const inst = pageRefs[key]
  if (!inst) return
  if (on && typeof inst.activate === 'function') inst.activate()
  if (!on && typeof inst.deactivate === 'function') inst.deactivate()
}

async function switchPage(index) {
  if (activeNav.value === index) return
  const prev = activeNav.value

  // 先停上一个
  if (prev !== 0) setPageActive(prev, false)

  activeNav.value = index

  // 再启下一个
  if (index !== 0) {
    await nextTick()
    setPageActive(index, true)
  }
}

// 首屏：如果默认打开的是非主页，也要激活
onMounted(async () => {
  await nextTick()
  if (activeNav.value !== 0) setPageActive(activeNav.value, true)
})

const load = useReload()

const reloadKey = load.reloadKey
const reload = load.reload


// ★ 缩放状态提升到父组件
const scaleSliderValue = ref(100) // 滑块显示值（60~100）
const scaleValue = ref(1.0) // 面板缩放（0.6~1.0）

// 进度状态
const progressTotal = ref(0)
const progressCurrent = ref(0)
const currentMapName = ref('')

const onScaleChange = (val) => {
  scaleSliderValue.value = val
  scaleValue.value = val / 100
}


const reloading = ref(false)

function onReloadClick() {
  reloading.value = true
  reload(1000)
  // 1000ms 后停止旋转
  setTimeout(() => {
    reloading.value = false
  }, 1000)
}
</script>

<style>
/* ================== 玻璃面板 ================== */
/* 外层：fixed 铺满视口，flex 居中 */
.glass-panel {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  pointer-events: none;
  /* 空白区域不吃点击 */
}

/* 内层：真正面板 */
.glass-inner {
  pointer-events: auto;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  clip-path: inset(0 round 13px);
  width: var(--panel-w, 596px);
  height: var(--panel-h, 372px);
  padding: 6px;
  background: #1a1a2e;
  box-sizing: border-box;
  position: relative;

  /* 缩放过渡 + 缩放原点居中 */
  transform-origin: center center;
  transition: transform 0.2s ease;
  will-change: transform;
}

/* ================== 第一层：底层大曲面 ================== */
.glass-inner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 90% 70% at 20% 10%,
  rgba(230, 200, 160, 0.95) 0%,
  rgba(230, 200, 160, 0) 55%),
  radial-gradient(ellipse 80% 90% at 85% 90%,
      rgba(123, 94, 167, 0.9) 0%,
      rgba(123, 94, 167, 0) 60%),
  linear-gradient(160deg,
      #d4b896 0%,
      #c9a0b0 35%,
      #7b5ea7 70%,
      #4a3268 100%);
  z-index: 0;
  pointer-events: none;
}

/* ================== 第二层：花瓣折叠光影 ================== */
.glass-inner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 60% 40% at 30% 25%,
  rgba(255, 245, 220, 0.65) 0%,
  rgba(255, 245, 220, 0) 50%),
  radial-gradient(ellipse 50% 60% at 55% 50%,
      rgba(80, 60, 100, 0.45) 0%,
      rgba(80, 60, 100, 0) 60%),
  radial-gradient(ellipse 70% 50% at 75% 70%,
      rgba(200, 180, 220, 0.5) 0%,
      rgba(200, 180, 220, 0) 55%);
  mix-blend-mode: overlay;
  z-index: 0;
  pointer-events: none;
}

.glass-inner > * {
  position: relative;
  z-index: 1;
}

html.sky-hit-test-repair .glass-inner {
  clip-path: none !important;
  -webkit-transform: translateZ(0) !important;
  transform: translateZ(0) !important;
  will-change: transform !important;
}

html.sky-hit-test-repair .glass-inner * {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* ================== 1 分钟色调切换动画 ================== */
@keyframes toneShift {

  0%,
  100% {
    filter: hue-rotate(0deg) saturate(1);
  }

  50% {
    filter: hue-rotate(200deg) saturate(0.8);
  }
}

/* ================== 深色模式 ================== */
@media (prefers-color-scheme: dark) {
  .glass-inner::before {
    background: radial-gradient(ellipse 80% 60% at 30% 20%,
    rgba(168, 200, 232, 0.85) 0%,
    rgba(168, 200, 232, 0) 55%),
    radial-gradient(ellipse 70% 80% at 70% 80%,
        rgba(30, 50, 100, 0.95) 0%,
        rgba(30, 50, 100, 0) 60%),
    linear-gradient(160deg,
        #2a3a6b 0%,
        #1e2749 50%,
        #0a0e1f 100%);
  }

  .glass-inner::after {
    background: radial-gradient(ellipse 60% 40% at 30% 25%,
    rgba(180, 210, 240, 0.5) 0%,
    rgba(180, 210, 240, 0) 50%),
    radial-gradient(ellipse 50% 60% at 55% 50%,
        rgba(10, 20, 50, 0.5) 0%,
        rgba(10, 20, 50, 0) 60%),
    radial-gradient(ellipse 70% 50% at 75% 70%,
        rgba(140, 180, 220, 0.4) 0%,
        rgba(140, 180, 220, 0) 55%);
  }
}

.panel-title {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  color: white;
  font-weight: 600;
  font-size: 0.5rem;
  pointer-events: auto;
}

.panel-subtitle {
  color: white;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.audio-bar {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 10px;
}

.audio-bar-span {
  width: 2px;
  background: #fff;
  border-radius: 1px;
  animation: audioWave 1s infinite ease-in-out;
}

.audio-bar-span:nth-child(1) {
  animation-delay: 0s;
  height: 3px;
}

.audio-bar-span:nth-child(2) {
  animation-delay: 0.2s;
  height: 5px;
}

.audio-bar-span:nth-child(3) {
  animation-delay: 0.4s;
  height: 4px;
}

.audio-bar-span:nth-child(4) {
  animation-delay: 0.1s;
  height: 7px;
}

@keyframes audioWave {

  0%,
  100% {
    transform: scaleY(1);
  }

  50% {
    transform: scaleY(.4);
  }
}

.vertical-divider {
  flex: 0 0 1px;
  background-color: white;
  align-self: stretch;
  margin: 0;
  position: relative;
  left: 4px;
}

.right-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0px 8px;
  position: relative;
  left: auto;
  top: auto;
  right: auto;
  bottom: auto;
  max-height: calc(100vh - 24px);
  -ms-overflow-style: none;
}

.right-container::-webkit-scrollbar {
  display: none;
}

.reload-icon {
  display: none;
  position: absolute;
  z-index: 99999;
  top: 2px;
  left: 1px;
  color: #fff;
  /* display: inline-block; */
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  /* ★ 用 transform 统一控制旋转中心 */
  transform-origin: center center;
  will-change: transform;
  pointer-events: auto;
}

/* 旋转状态 */
.reload-icon.is-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>