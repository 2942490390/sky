<template>
  <view class="page">
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-people-arrows"></text>
        <text>带人跑图</text>
      </view>
      <button class="sky-btn" @click="drpt" @touchstart.stop>打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-location-dot"></text>
        <text>带人传送</text>
      </view>
      <button class="sky-btn" @click="drcs" @touchstart.stop>打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-feather"></text>
        <text>带人拿翼</text>
      </view>
      <button class="sky-btn" @click="drny" @touchstart.stop>打开</button>
    </view>
    <view class="sky-task">
      <view class="task-left">
        <text class="fa-solid fa-fire"></text>
        <text>带人献祭</text>
      </view>
      <button class="sky-btn" @click="drxj" @touchstart.stop>打开</button>
    </view>
  </view>
</template>

<script setup>
function drpt() { console.log('drpt') }
function drcs() { console.log('drcs') }
function drny() { console.log('drny') }
function drxj() { console.log('drxj') }
</script>