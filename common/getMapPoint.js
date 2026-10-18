// common/getMapPoint.js
import { subMapData } from './warpSpots.js'

// 把 Vue 里用的中文名，映射到 mapIdToName 里的标准中文名
const zhAlias = {
	// 云野
	'蝴蝶平原': '云野一图',
	'幽光山洞': '云野左图',
	'云顶浮石': '云野右图',
	'圣岛': '圣域群岛',
	'仙乡': '云野三塔',
	'中央神坛': '云野八人门',
	// 雨林
	'雨林': '雨林一图',
	'荧光森林': '雨林二图',
	'秘密花园': '雨林副本',
	'地下溶洞': '雨林副本洞穴',
	'密林遗迹': '雨林水母图',
	// 霞谷
	'霞谷': '霞谷一图',
	'赛道二阶段': '赛道终点',
	// 墓土
	'暮土入口': '墓土起点',
	'暮土': '墓土破庙',
	'巨兽荒原': '墓土龙图',
	'黑水港湾': '墓土沉船',
	'远古战场': '墓土古战场',
	// 禁阁
	'禁阁': '禁阁低层',
	'档案阁': '禁阁地下室',
	'秘密基地': '办公室',
	'禁阁终点': '禁阁神殿',
	// 伊甸
	'伊甸入口': '暴风眼一图',
	'伊甸': '暴风眼二图',
	'伊甸之眼': '伊甸献祭',
	'重生之路': '重生一图',
	'重生之路终点': '重生二图',
}

// I32 → 中文名（模块顶层，buildRycsId 和 h5gg 兜底都要用）
const mapIdToName = {
	'-768833570': '遇境',
	'1649439303': '晨岛',
	'1509719447': '云巢',
	'-1817621630': '云野一图',
	'-1050035699': '云野左图',
	'312004957': '云野右图',
	'-1237641587': '圣域群岛',
	'-1944435120': '云野三塔',
	'-1900248111': '云野八人门',
	'1190972738': '云野神殿',
	'164626931': '雨林一图',
	'-1455381650': '雨林二图',
	'-1574275404': '雨林副本',
	'-161371567': '雨林副本洞穴',
	'-2135324521': '雨林水母图',
	'128844448': '雨林神殿',
	'1638008359': '霞谷一图',
	'-2115418256': '霞光城',
	'1844499196': '飞行赛道',
	'571720490': '滑雪赛道',
	'-1934656620': '赛道终点',
	'507487826': '霞谷神殿',
	'817373972': '墓土起点',
	'1147491976': '墓土破庙',
	'170656205': '失落方舟',
	'864432821': '墓土龙图',
	'-1644045427': '墓土沉船',
	'1597085778': '墓土古战场',
	'-136010643': '墓土神殿',
	'-1936060159': '禁阁低层',
	'2518601': '禁阁地下室',
	'-1987505335': '禁阁高层',
	'-2027781754': '禁阁神殿',
	'295816905': '办公室',
	'-1184245578': '暴风眼一图',
	'1705189686': '暴风眼二图',
	'-815180717': '伊甸献祭',
	'-857831781': '重生一图',
	'567986524': '重生二图',
	'-2043682661': '星光大道',
	'261807733': '结尾动画',
}

// 用 mapIdToName + zhAlias + subMapData 自动生成 rycs_id
export const buildRycsId = (spots = subMapData) => {
	const zhToI32 = {}
	for (const [i32, zh] of Object.entries(mapIdToName)) {
		zhToI32[zh] = i32
	}

	const rycs = {}
	for (const group of Object.values(spots)) {
		for (const spot of group.spots) {
			const stdZh = zhAlias[spot.name] || spot.name
			const i32 = zhToI32[stdZh]
			if (!i32) continue          // mapIdToName 里没有，走运行时兜底/近似传送
			if (rycs[i32]) continue
			rycs[i32] = { name: spot.warpId, zh_name: stdZh }
		}
	}
	return rycs
}

// 手写 rycs_id（精确条目，优先级最高；与自动生成合并时以这里为准）
const manualRycsId = {
	'-768833570': { name: 'CandleSpace', zh_name: '遇境' },
	'1509719447': { name: 'MainStreet', zh_name: '云巢' },
	'1649439303': { name: 'Dawn', zh_name: '晨岛' },
	'-1817621630': { name: 'Prairie_ButterflyFields', zh_name: '云野一图' },
	'-1050035699': { name: 'Prairie_Cave', zh_name: '云野左图' },
	'312004957': { name: 'Prairie_NestAndKeeper', zh_name: '云野右图' },
	'-1237641587': { name: 'Prairie_Island', zh_name: '圣域群岛' },
	'-1944435120': { name: 'Prairie_Village', zh_name: '云野三塔' },
	'-1900248111': { name: 'DayHubCave', zh_name: '云野八人门' },
	'1190972738': { name: 'DayEnd', zh_name: '云野神殿' },
	'164626931': { name: 'Rain', zh_name: '雨林一图' },
	'-1455381650': { name: 'RainForest', zh_name: '雨林二图' },
	'-1574275404': { name: 'RainShelter', zh_name: '雨林副本' },
	'-161371567': { name: 'Rain_Cave', zh_name: '雨林副本洞穴' },
	'-2135324521': { name: 'RainMid', zh_name: '雨林水母图' },
	'128844448': { name: 'RainEnd', zh_name: '雨林神殿' },
	'1638008359': { name: 'Sunset', zh_name: '霞谷一图' },
	'-2115418256': { name: 'Sunset_Citadel', zh_name: '霞光城' },
	'1844499196': { name: 'Sunset_FlyRace', zh_name: '飞行赛道' },
	'571720490': { name: 'SunsetRace', zh_name: '滑雪赛道' },
	'-1934656620': { name: 'SunsetEnd', zh_name: '赛道终点' },
	'507487826': { name: 'SunsetEnd2', zh_name: '霞谷神殿' },
	'817373972': { name: 'DuskStart', zh_name: '墓土起点' },
	'1147491976': { name: 'Dusk', zh_name: '墓土破庙' },
	'170656205': { name: 'DuskOasis', zh_name: '失落方舟' },
	'864432821': { name: 'DuskGraveyard', zh_name: '墓土龙图' },
	'-1644045427': { name: 'Dusk_CrabField', zh_name: '墓土沉船' },
	'1597085778': { name: 'DuskMid', zh_name: '墓土古战场' },
	'-136010643': { name: 'DuskEnd', zh_name: '墓土神殿' },
	'-1936060159': { name: 'Night', zh_name: '禁阁低层' },
	'2518601': { name: 'NightArchive', zh_name: '禁阁地下室' },
	'-1987505335': { name: 'Night2', zh_name: '禁阁高层' },
	'-2027781754': { name: 'NightEnd', zh_name: '禁阁神殿' },
	'295816905': { name: 'TGCOffice', zh_name: '办公室' },
	'-1184245578': { name: 'StormStart', zh_name: '暴风眼一图' },
	'1705189686': { name: 'Storm', zh_name: '暴风眼二图' },
	'-815180717': { name: 'StormEnd', zh_name: '伊甸献祭' },
	'-857831781': { name: 'OrbitMid', zh_name: '重生一图' },
	'567986524': { name: 'OrbitEnd', zh_name: '重生二图' },
	'-2043682661': { name: 'CandleSpaceEnd', zh_name: '星光大道' },
	'261807733': { name: 'Credits', zh_name: '结尾动画' },
}

export const map_point = () => {
	return {
		mapIdFinder: {
			feature: 3267887104,
			featureOffset: -8,
			idOffset: 4,
		},
		warpCsdzFinder: {
			feature: 1487508559,
			featureOffset: 0,
			idOffset: 12,
		},
		mapIdToName,
		// 手写优先，自动生成补漏
		rycs_id: { ...buildRycsId(), ...manualRycsId },
		// 兜底用
		zhAlias,
	}
}

// 供 h5gg.js 直接 import，避免每次 map_point() 重复构造
export { mapIdToName, zhAlias }