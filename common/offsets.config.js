// common/offsets.config.js
// 指针链配置文件
// 格式：{ key: [base, [offset1, offset2, ...]], ... }
// base 和 offset 都可以是数字或 '0x...' 字符串

export default {
	rwdz: [0x04754ED0, [0x6B0, 0x20]], // 人物
	energy: [0x57B9268, [0x1C68, 0x5C10]], // 能量
	goldF32: [0x57A9568, [0xC8, 0x988, 0x6564]], // 高度
	daoju: [0x54A3B48, [0xC48, 0x40, 0x5C60]], // 道具
	lengqu: [0x54A3B48, [0xC48, 0x40, 0x5C70]], // 冷却
	gysl: [0x57A9568, [0xC8, 0x8F0, 0x61C8]], // 光翼
	zy: [0x57B9268, [0x1C68, 0x5D38]], // 炸翼
	lzaddr: [0x5485F90, [0x1EC8, 0x6800, 0x6FB8]], // 蜡烛
	zhuahua: [0x545FF28, [0xE8, 0x934]], // 炸花
	wxyh: [0x4885c30, [0x108, 0x4a24]], // 烟花
	wxmf: [0x54A38B8, [0xC70, 0x1B90, 0x49F4]], // 魔法
	bigjump: [0x44B6338, [0x6B74]], // 大跳


	// ===== 相对 playerCoord（用你项目已有 energy 的前缀）=====
	ysaring: [0x57B9268, [0x1C68, -0x6AB040]],   // F32 隐身
	fq: [0x57B9268, [0x1C68, -0x9A94CC]],   // F32 去风墙
	outfit: [0x57B9268, [0x1C68, 0x874C]],      // I32 烟花槽位
	wxyha: [0x57B9268, [0x1C68, 0xA924]],      // I32 烟花数量

	// ===== ajOff(L0 + A, B)（用 demo10 的 L0 锚点）=====
	noWingGuard: [0x48E06D0, [0x83C0, 0xF10]],   // I32 守护无翼
	autoIgnite: [0x48E06D0, [0x8370, 0x278]],   // F32 燃烧弹
	offline: [0x48E06D0, [0x7EC8, 0x3C]],   // 全局离线（L0 体系）

	// ===== dj() 直接地址（不填 key，用 getModuleAddr）=====
	// krill / skipAnim / FJD / jshy 不在此配置
}