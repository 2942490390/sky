<template>
	<view class="left-area">
		<view v-for="(item, index) in navItems" :key="index" class="aa" :class="{ active: activeIndex === index }"
			@click="emit('change', index)">
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
		}, // ← 新增

	]
</script>

<style scoped>
	/* 原 .left-area / .aa / .aa:hover / .aa.active */
	.left-area {
		flex: 0 0 20%;
		/* ★ 固定占 20% 宽 */
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		position: relative;
		/* 覆盖原来的 absolute */
		left: auto;
		top: auto;
		transform: none;
	}

	.left-area::-webkit-scrollbar {
		display: none;
	}

	.aa {
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
	}

	.aa:hover {
		background: rgba(255, 255, 255, .2);
	}

	.aa.active {
		background: #ADB5BD;
		border-color: white;
	}
</style>