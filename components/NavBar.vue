<template>
	<view class="left-area">
		<view v-for="(item, index) in navItems" :key="index" class="sidebar-list"
			:class="{ active: activeIndex === index }" @click="emit('change', index)">
			<text :class="item.icon"></text>
			<text>{{ item.label }}</text>
		</view>
	</view>
</template>

<script setup>
	defineProps({
		activeIndex: {
			type: Number,
			default: 0
		}
	})
	const emit = defineEmits(['change'])

	const navItems = [{
			icon: 'fa-solid fa-house',
			label: '主页'
		},
		{
			icon: 'fa-solid fa-circle-dot',
			label: '原地'
		},
		{
			icon: 'fa-solid fa-screwdriver-wrench',
			label: '实用'
		},
		{
			icon: 'fa-solid fa-face-laugh-beam',
			label: '娱乐'
		},
		{
			icon: 'fa-solid fa-paper-plane',
			label: '传送'
		},
		{
			icon: 'fa-solid fa-people-group',
			label: '带人'
		},
		{
			icon: 'fa-solid fa-file-powerpoint',
			label: '指针'
		},
		{
			icon: 'fa-solid fa-gear',
			label: '设置'
		},

	]
</script>

<style scoped>

	/* 用 active 给触摸反馈 */
	.sidebar-list:active {
		background: rgba(255, 255, 255, .2);
	}

	.left-area {
		flex: 0 0 15%;
		/* ★ 固定占 20% 宽 */
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		position: relative;
		/* 覆盖原来的 absolute */
		left: auto;
		top: auto;
		transform: translateZ(0); /* 提升为合成层，加速 hit-test */
	}

	.left-area::-webkit-scrollbar {
		display: none;
	}

	.sidebar-list {
		padding: 8rpx;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 14px;
		color: white;
		font-size: 13px;
		text-align: left;
		cursor: pointer;
		transition: 0.2s;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none
	}

	.sidebar-list.active {
		background: rgba(211,211,211,0.5);
		border-color: white;
	}
</style>