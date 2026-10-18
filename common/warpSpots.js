// common/warpSpots.js
// 传送点数据：Vue 页面和 getMapPoint.js 共用，避免两处维护

export const subMapData = {
	yujing: {
		name: "遇境",
		spots: [
			{ name: "遇境", warpId: "CandleSpace" },
			{ name: "小镇", warpId: "MainStreet" },
			{ name: "飞行指引", warpId: "MainStreetFlyingIntro" },
			{ name: "筑巢工坊-服装", warpId: "MainStreet_ShopOutfits" },
			{ name: "筑巢工坊-魔法", warpId: "MainStreet_ShopSpells" },
			{ name: "筑巢工坊-道具", warpId: "MainStreet_ShopProps" },
			{ name: "公寓", warpId: "MainStreet_Apartment" },
			{ name: "甜点工坊", warpId: "MainStreet_Cafe" },
			{ name: "音乐餐厅", warpId: "MainStreet_ConcertHall" },
			{ name: "冥想之地", warpId: "MainStreet_Soundbath" },
			{ name: "仙境茶会", warpId: "MainStreet_Cafe_Wonderland" }
		]
	},
	chendao: {
		name: "晨岛",
		spots: [
			{ name: "晨岛", warpId: "Dawn" },
			{ name: "预言山谷", warpId: "DawnCave" },
			{ name: "水之试炼", warpId: "Dawn_TrialsWater" },
			{ name: "土之试炼", warpId: "Dawn_TrialsEarth" },
			{ name: "风之试炼", warpId: "Dawn_TrialsAir" },
			{ name: "火之试炼", warpId: "Dawn_TrialsFire" }
		]
	},
	yunye: {
		name: "云野",
		spots: [
			{ name: "蝴蝶平原", warpId: "Prairie_ButterflyFields" },
			{ name: "幽光山洞", warpId: "Prairie_Cave" },
			{ name: "云顶浮石", warpId: "Prairie_NestAndKeeper" },
			{ name: "圣岛", warpId: "Prairie_Island" },
			{ name: "仙乡", warpId: "Prairie_Village" },
			{ name: "云峰", warpId: "Prairie_WildLifePark" },
			{ name: "中央神坛", warpId: "DayHubCave" },
			{ name: "云野神殿", warpId: "DayEnd" }
		]
	},
	yulin: {
		name: "雨林",
		spots: [
			{ name: "雨林", warpId: "Rain" },
			{ name: "荧光森林", warpId: "RainForest" },
			{ name: "密林遗迹", warpId: "RainMid" },
			{ name: "秘密花园", warpId: "RainShelter" },
			{ name: "青鸟剧场", warpId: "Rain_BlueBirdTheater" },
			{ name: "地下溶洞", warpId: "Rain_Cave" },
			{ name: "大树屋", warpId: "Rain_BaseCamp" },
			{ name: "雨林神殿", warpId: "RainEnd" },
			{ name: "风行网道", warpId: "Skyway" }
		]
	},
	xiagu: {
		name: "霞谷",
		spots: [
			{ name: "霞谷", warpId: "Sunset" },
			{ name: "滑雪赛道", warpId: "SunsetRace" },
			{ name: "霞光城", warpId: "Sunset_Citadel" },
			{ name: "飞行赛道", warpId: "Sunset_FlyRace" },
			{ name: "赛道二阶段", warpId: "SunsetEnd" },
			{ name: "落日竞技场", warpId: "SunsetColosseum" },
			{ name: "霞谷神殿", warpId: "SunsetEnd2" },
			{ name: "圆梦村", warpId: "SunsetVillage" },
			{ name: "圆梦村剧场", warpId: "Sunset_Theater" },
			{ name: "音乐大厅", warpId: "SunsetVillage_MusicShop" },
			{ name: "雪隐峰", warpId: "Sunset_YetiPark" },
			{ name: "欧诺拉-鱼", warpId: "Event_Arr_Runaway" },
			{ name: "欧诺拉-水母", warpId: "Event_Arr_SoftInside" },
			{ name: "欧诺拉-鲲", warpId: "Event_Arr_Warrior" },
			{ name: "欧诺拉-鸟", warpId: "Event_Arr_TheSeed" },
			{ name: "欧诺拉-蝴蝶", warpId: "Event_Arr_EyesOfAChild" },
			{ name: "欧诺拉-被淹没的世界", warpId: "Event_Arr_ExhaleInhale" },
			{ name: "嘉年华影院", warpId: "Event_Cinema" },
			{ name: "MBTI 性格测验", warpId: "Event_Personality" }
		]
	},
	mutu: {
		name: "墓土",
		spots: [
			{ name: "暮土入口", warpId: "DuskStart" },
			{ name: "暮土", warpId: "Dusk" },
			{ name: "藏宝岛礁", warpId: "Dusk_Triangle" },
			{ name: "藏宝岛礁海底", warpId: "Dusk_TriangleEnd" },
			{ name: "失落方舟", warpId: "DuskOasis" },
			{ name: "巨兽荒原", warpId: "DuskGraveyard" },
			{ name: "黑水港湾", warpId: "Dusk_CrabField" },
			{ name: "远古战场", warpId: "DuskMid" },
			{ name: "远古战场-往昔", warpId: "DuskMid_Past" },
			{ name: "远古战场-往昔市集", warpId: "DuskMid_PastMarket" },
			{ name: "荒废神殿", warpId: "Dusk_HiddenTemple" },
			{ name: "暮土神殿", warpId: "DuskEnd" },
			{ name: "暮土神殿-往昔", warpId: "DuskEnd_Past" },
			{ name: "任天堂遇境", warpId: "Nintendo_CandleSpace" },
			{ name: "冥龙之夜", warpId: "Event_WerewolfGame" }
		]
	},
	jinge: {
		name: "禁阁",
		spots: [
			{ name: "禁阁", warpId: "Night" },
			{ name: "档案阁", warpId: "NightArchive" },
			{ name: "秘密基地", warpId: "TGCOffice" },
			{ name: "共玩空间", warpId: "VoidSharedSpace" },
			{ name: "螃蟹的恶搞派对", warpId: "Event_DaysOfMischief" },
			{ name: "恶作剧密室", warpId: "Event_DaysOfMischief_Escape" },
			{ name: "禁阁高层", warpId: "Night2" },
			{ name: "禁阁终点", warpId: "NightEnd" },
			{ name: "星光沙漠", warpId: "NightDesert" },
			{ name: "小王子的梦", warpId: "NightDesert_Planets" },
			{ name: "星光沙漠海滩", warpId: "NightDesert_Beach" },
			{ name: "星光沙漠无限", warpId: "Night_InfiniteDesert" },
			{ name: "星光沙漠洞穴", warpId: "Night_JarCave" },
			{ name: "庇护所", warpId: "Night_Shelter" },
			{ name: "藏星阁", warpId: "Night_IPHallway" },
			{ name: "月牙绿洲", warpId: "Night_PaintedWorld" },
			{ name: "姆明谷的森林", warpId: "Night_ValleyForest" },
			{ name: "姆明屋", warpId: "Night_ValleyHouse" },
			{ name: "姆明天空屋", warpId: "Night_ValleyHouseSky" },
			{ name: "月圆之地", warpId: "Event_DaysOfMoonlight_HugeMoon" },
			{ name: "残灯墟", warpId: "Night_Jumble" },
			{ name: "织光阁", warpId: "Night_Workshop" },
			{ name: "虚空", warpId: "Season24Void1" },
			{ name: "姆明故事书", warpId: "Night_StoryBook" }
		]
	},
	yidian: {
		name: "伊甸",
		spots: [
			{ name: "伊甸入口", warpId: "StormStart" },
			{ name: "伊甸", warpId: "Storm" },
			{ name: "伊甸之眼", warpId: "StormEnd" },
			{ name: "重生之路", warpId: "OrbitMid" },
			{ name: "重生之路终点", warpId: "OrbitEnd" },
			{ name: "星光大道", warpId: "CandleSpaceEnd" },
			{ name: "结尾动画", warpId: "Credits" },
			{ name: "远古记忆", warpId: "StormEvent_VoidSpace" },
			{ name: "AR 相机测试图", warpId: "AR_TestLevel" }
		]
	}
}