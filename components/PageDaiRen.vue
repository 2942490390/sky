<template>
  <view class="page">
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-people-arrows"></text>
        <text>带人跑图</text>
      </view>
      <button class="sky-btn" @click="drpt()">打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-location-dot"></text>
        <text>带人传送</text>
      </view>
      <button class="sky-btn" @click="drcs()">打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-feather"></text>
        <text>带人拿翼</text>
      </view>
      <button class="sky-btn" @click="drny()">打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-fire"></text>
        <text>带人献祭</text>
      </view>
      <button class="sky-btn" @click="drxj()">打开</button>
    </view>
  </view>
</template>

<script setup>
// ===== 原样保留的方法 =====
function drpt() { console.log('drpt') }
function drcs() { console.log('drcs') }
function drny() { console.log('drny') }
function drxj() { console.log('drxj') }
</script>