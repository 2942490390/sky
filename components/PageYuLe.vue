<template>
	<view class="page">
		<!-- ========== 分组列表 ========== -->
		<view v-show="currentGroup === null" class="map-list">
			<view v-for="(g, key) in groupList" :key="key" class="sky-task">
				<view class="task-left">
					<text :class="g.icon"></text>
					<text>{{ g.name }}</text>
				</view>
				<button class="sky-btn-toggle" @click="openGroup(key)">进入</button>
			</view>
		</view>

		<!-- ========== 分组内容 ========== -->
		<view v-show="currentGroup !== null">
			<!-- 返回栏 -->
			<view class="sky-task" style="margin-bottom:6px;">
				<view class="task-left">
					<text class="fa-solid fa-arrow-left"></text>
					<text>返回分组列表</text>
				</view>
				<button class="sky-btn sky-btn-back" @click="backToGroupList">返回</button>
			</view>

			<!-- 角色相关 -->
			<RoleGroup v-if="currentGroup === 'role'" />

			<!-- 引擎相关 -->
			<EngineGroup v-if="currentGroup === 'engine'" />

			<!-- 能力相关 -->
			<AbilityGroup v-if="currentGroup === 'ability'" />
		</view>
	</view>
</template>

<script setup>
import {ref} from 'vue'
import RoleGroup from './yule/RoleGroup.vue'
import EngineGroup from './yule/EngineGroup.vue'
import AbilityGroup from './yule/AbilityGroup.vue'

const groupList = {
	role: { name: '角色相关', icon: 'fa-solid fa-user' },
	engine: { name: '引擎相关', icon: 'fa-solid fa-gear' },
	ability: { name: '能力相关', icon: 'fa-solid fa-wand-magic-sparkles' }
}

const currentGroup = ref(null)

function openGroup(key) {
	currentGroup.value = key
}

function backToGroupList() {
	currentGroup.value = null
}
</script>