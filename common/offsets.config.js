// common/offsets.config.js
// 指针链配置文件
// 格式：{ key: [base, [offset1, offset2, ...]], ... }
// base 和 offset 都可以是数字或 '0x...' 字符串

export default {
	rwdz: [0x48CC368, [0x3E50, 0x4F00]], // 人物
	energy: [0x52ADB50, [0x1378, 0x8000, 0xC8]], // 能量
	goldF32: [0x57A9568, [0xC8, 0x988, 0x6564]], // 高度
	daoju: [0x54A3B48, [0xC48, 0x40, 0x5C60]], // 道具
	lengqu: [0x54A3B48, [0xC48, 0x40, 0x5C70]], // 冷却
	gysl: [0x57A9568, [0xC8, 0x8F0, 0x61C8]], // 光翼
	zy: [0x57B9268, [0x1C68, 0x5D38]], // 炸翼
	lzaddr: [0x492A228, [0x358, 0x6E68]], // 蜡烛
	zhuahua: [0x48cb7f0, [0xd8, 0x4b14]], // 炸花
	wxyh: [0x48cb7f0, [0xd8, 0x4b14]], // 烟花
	wxmf: [0x54A38B8, [0xC70, 0x1B90, 0x49F4]], // 魔法
	bigjump: [0x44EE578, [0x7FD4]], // 大跳


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