// common/functionLabels.js
// 功能 key 的显示名映射
// 改 label 只改这里，DEFAULT_OFFSETS 的 key 不变

export const FUNCTION_LABELS = {
	rwdz: '人物地址',
	goldF32: '设置高度',
	energy: '无限能量',
	daoju: '无限道具',
	lengqu: '冷却时间',
	gysl: '光翼数量',
	zy: '炸翼数量',
	lzaddr: '蜡烛地址',
	zhuahua: '炸花地址',
	wxyh: '无限烟花',
	wxmf: '无限魔法'
}

/**
 * 根据 key 拿显示名，没配置的返回 key 本身
 */
export function getLabel(key) {
	return FUNCTION_LABELS[key] || key
}