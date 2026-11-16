// common/map/warpSpots.js
// 传送点数据：Vue 页面和 getMapPoint.js 共用
// anyDoorCode: 任意门关卡英文名（必须与游戏 Map_Info 完全一致，区分大小写）
//              为 null 表示该点不支持任意门

export const subMapData = {
	yujing: {
		name: "遇境",
		spots: [
			{ name: "遇境", warpId: "CandleSpace", anyDoorCode: "CandleSpace" },
			{ name: "云巢", warpId: "MainStreet", anyDoorCode: "MainStreet" },
			{ name: "故事空间", warpId: "MainStreet_StorySpace", anyDoorCode: "MainStreet_StorySpace" },
			{ name: "飞行指引", warpId: "MainStreetFlyingIntro", anyDoorCode: "MainStreetFlyingIntro" },
			{ name: "筑巢工坊-服装", warpId: "MainStreet_ShopOutfits", anyDoorCode: "MainStreet_ShopOutfits" },
			{ name: "筑巢工坊-魔法", warpId: "MainStreet_ShopSpells", anyDoorCode: "MainStreet_ShopSpells" },
			{ name: "筑巢工坊-道具", warpId: "MainStreet_ShopProps", anyDoorCode: "MainStreet_ShopProps" },
			{ name: "云巢小屋", warpId: "MainStreet_Apartment", anyDoorCode: "MainStreet_Apartment" },
			{ name: "甜点工坊", warpId: "MainStreet_Cafe", anyDoorCode: "MainStreet_Cafe" },
			{ name: "音乐餐厅", warpId: "MainStreet_ConcertHall", anyDoorCode: "MainStreet_ConcertHall" },
			{ name: "冥想之地", warpId: "MainStreet_Soundbath", anyDoorCode: "MainStreet_Soundbath" },
			{ name: "仙境茶会", warpId: "MainStreet_Cafe_Wonderland", anyDoorCode: "MainStreet_Cafe_Wonderland" },
			{ name: "AR卧室", warpId: "AR_Bedroom", anyDoorCode: "AR_Bedroom" },
			{ name: "AR麦田", warpId: "AR_WheatField", anyDoorCode: "AR_WheatField" },
			{ name: "法国，阿尔勒小屋", warpId: "Nest_Night_GO_Town", anyDoorCode: "Nest_Night_GO_Town" },
			{ name: "AR测试关卡", warpId: "AR_TestLevel", anyDoorCode: "AR_TestLevel" },
			{ name: "地下办公室", warpId: "UndergroundOffice", anyDoorCode: "UndergroundOffice" },
			{ name: "狂欢季", warpId: "MainStreet_FunArmada", anyDoorCode: "MainStreet_FunArmada" },
		]
	},
	chendao: {
		name: "晨岛",
		spots: [
			{ name: "晨岛", warpId: "Dawn", anyDoorCode: "Dawn" },
			{ name: "预言山谷", warpId: "DawnCave", anyDoorCode: "DawnCave" },
			{ name: "水之试炼", warpId: "Dawn_TrialsWater", anyDoorCode: "Dawn_TrialsWater" },
			{ name: "土之试炼", warpId: "Dawn_TrialsEarth", anyDoorCode: "Dawn_TrialsEarth" },
			{ name: "风之试炼", warpId: "Dawn_TrialsAir", anyDoorCode: "Dawn_TrialsAir" },
			{ name: "火之试炼", warpId: "Dawn_TrialsFire", anyDoorCode: "Dawn_TrialsFire" }
		]
	},
	yunye: {
		name: "云野",
		spots: [
			{ name: "蝴蝶平原", warpId: "Prairie_ButterflyFields", anyDoorCode: "Prairie_ButterflyFields" },
			{ name: "幽光山洞", warpId: "Prairie_Cave", anyDoorCode: "Prairie_Cave" },
			{ name: "云顶浮石", warpId: "Prairie_NestAndKeeper", anyDoorCode: "Prairie_NestAndKeeper" },
			{ name: "圣岛", warpId: "Prairie_Island", anyDoorCode: "Prairie_Island" },
			{ name: "仙乡", warpId: "Prairie_Village", anyDoorCode: "Prairie_Village" },
			{ name: "云峰", warpId: "Prairie_WildLifePark", anyDoorCode: "Prairie_WildLifePark" },
			{ name: "中央神坛", warpId: "DayHubCave", anyDoorCode: "DayHubCave" },
			{ name: "云野神殿", warpId: "DayEnd", anyDoorCode: "DayEnd" }
		]
	},
	yulin: {
		name: "雨林",
		spots: [
			{ name: "雨林", warpId: "Rain", anyDoorCode: "Rain" },
			{ name: "荧光森林", warpId: "RainForest", anyDoorCode: "RainForest" },
			{ name: "密林遗迹", warpId: "RainMid", anyDoorCode: "RainMid" },
			{ name: "秘密花园", warpId: "RainShelter", anyDoorCode: "RainShelter" },
			{ name: "青鸟剧场", warpId: "Rain_BlueBirdTheater", anyDoorCode: "Rain_BlueBirdTheater" },
			{ name: "地下溶洞", warpId: "Rain_Cave", anyDoorCode: "Rain_Cave" },
			{ name: "大树屋", warpId: "Rain_BaseCamp", anyDoorCode: "Rain_BaseCamp" },
			{ name: "雨林神殿", warpId: "RainEnd", anyDoorCode: "RainEnd" },
			{ name: "风行网道", warpId: "Skyway", anyDoorCode: "Skyway" }
		]
	},
	xiagu: {
		name: "霞谷",
		spots: [
			{ name: "霞谷", warpId: "Sunset", anyDoorCode: "Sunset" },
			{ name: "滑雪赛道", warpId: "SunsetRace", anyDoorCode: "SunsetRace" },
			{ name: "霞光城", warpId: "Sunset_Citadel", anyDoorCode: "Sunset_Citadel" },
			{ name: "飞行赛道", warpId: "Sunset_FlyRace", anyDoorCode: "Sunset_FlyRace" },
			{ name: "赛道二阶段", warpId: "SunsetEnd", anyDoorCode: "SunsetEnd" },
			{ name: "落日竞技场", warpId: "SunsetColosseum", anyDoorCode: "SunsetColosseum" },
			{ name: "霞谷神殿", warpId: "SunsetEnd2", anyDoorCode: "SunsetEnd2" },
			{ name: "圆梦村", warpId: "SunsetVillage", anyDoorCode: "SunsetVillage" },
			{ name: "圆梦村剧场", warpId: "Sunset_Theater", anyDoorCode: "Sunset_Theater" },
			{ name: "音乐大厅", warpId: "SunsetVillage_MusicShop", anyDoorCode: "SunsetVillage_MusicShop" },
			{ name: "雪隐峰", warpId: "Sunset_YetiPark", anyDoorCode: "Sunset_YetiPark" },
			{ name: "欧诺拉-鱼", warpId: "Event_Arr_Runaway", anyDoorCode: "Event_Arr_Runaway" },
			{ name: "欧诺拉-水母", warpId: "Event_Arr_SoftInside", anyDoorCode: "Event_Arr_SoftInside" },
			{ name: "欧诺拉-鲲", warpId: "Event_Arr_Warrior", anyDoorCode: "Event_Arr_Warrior" },
			{ name: "欧诺拉-鸟", warpId: "Event_Arr_TheSeed", anyDoorCode: "Event_Arr_TheSeed" },
			{ name: "欧诺拉-蝴蝶", warpId: "Event_Arr_EyesOfAChild", anyDoorCode: "Event_Arr_EyesOfAChild" },
			{ name: "欧诺拉-被淹没的世界", warpId: "Event_Arr_ExhaleInhale", anyDoorCode: "Event_Arr_ExhaleInhale" },
			{ name: "嘉年华影院", warpId: "Event_Cinema", anyDoorCode: "Event_Cinema" },
			{ name: "躲猫猫水晶城", warpId: "Event_HidenSeek_SnowVillage", anyDoorCode: "Event_HidenSeek_SnowVillage" },
		]
	},
	mutu: {
		name: "墓土",
		spots: [
			{ name: "暮土入口", warpId: "DuskStart", anyDoorCode: "DuskStart" },
			{ name: "暮土", warpId: "Dusk", anyDoorCode: "Dusk" },
			{ name: "任天堂遇境", warpId: "Nintendo_CandleSpace", anyDoorCode: "Nintendo_CandleSpace" },
			{ name: "MBTI 性格测验", warpId: "Event_Personality", anyDoorCode: "Event_Personality" },
			{ name: "珍珠村", warpId: "Dusk_PearlIsland", anyDoorCode: "Dusk_PearlIsland" },
			{ name: "珍珠湖", warpId: "Dusk_PearlSea", anyDoorCode: "Dusk_PearlSea" },
			{ name: "藏宝岛礁", warpId: "Dusk_Triangle", anyDoorCode: "Dusk_Triangle" },
			{ name: "藏宝岛礁海底", warpId: "Dusk_TriangleEnd", anyDoorCode: "Dusk_TriangleEnd" },
			{ name: "失落方舟", warpId: "DuskOasis", anyDoorCode: "DuskOasis" },
			{ name: "巨兽荒原", warpId: "DuskGraveyard", anyDoorCode: "DuskGraveyard" },
			{ name: "黑水港湾", warpId: "Dusk_CrabField", anyDoorCode: "Dusk_CrabField" },
			{ name: "远古战场", warpId: "DuskMid", anyDoorCode: "DuskMid" },
			{ name: "远古战场-往昔", warpId: "DuskMid_Past", anyDoorCode: "DuskMid_Past" },
			{ name: "远古战场-往昔市集", warpId: "DuskMid_PastMarket", anyDoorCode: "DuskMid_PastMarket" },
			{ name: "荒废神殿", warpId: "Dusk_HiddenTemple", anyDoorCode: "Dusk_HiddenTemple" },
			{ name: "暮土神殿", warpId: "DuskEnd", anyDoorCode: "DuskEnd" },
			{ name: "暮土神殿-往昔", warpId: "DuskEnd_Past", anyDoorCode: "DuskEnd_Past" },
			{ name: "冥龙之夜", warpId: "Event_WerewolfGame", anyDoorCode: "Event_WerewolfGame" },
		]
	},
	jinge: {
		name: "禁阁",
		spots: [
			{ name: "禁阁", warpId: "Night", anyDoorCode: "Night" },
			{ name: "档案阁", warpId: "NightArchive", anyDoorCode: "NightArchive" },
			{ name: "秘密基地", warpId: "TGCOffice", anyDoorCode: "TGCOffice" },
			{ name: "共玩空间", warpId: "VoidSharedSpace", anyDoorCode: "VoidSharedSpace" },
			{ name: "螃蟹的恶搞派对", warpId: "Event_DaysOfMischief", anyDoorCode: "Event_DaysOfMischief" },
			{ name: "恶作剧密室", warpId: "Event_DaysOfMischief_Escape", anyDoorCode: "Event_DaysOfMischief_Escape" },
			{ name: "禁阁高层", warpId: "Night2", anyDoorCode: "Night2" },
			{ name: "禁阁终点", warpId: "NightEnd", anyDoorCode: "NightEnd" },
			{ name: "星光沙漠", warpId: "NightDesert", anyDoorCode: "NightDesert" },
			{ name: "小王子的梦", warpId: "NightDesert_Planets", anyDoorCode: "NightDesert_Planets" },
			{ name: "星光沙漠海滩", warpId: "NightDesert_Beach", anyDoorCode: "NightDesert_Beach" },
			{ name: "星光沙漠无限", warpId: "Night_InfiniteDesert", anyDoorCode: "Night_InfiniteDesert" },
			{ name: "星光沙漠洞穴", warpId: "Night_JarCave", anyDoorCode: "Night_JarCave" },
			{ name: "庇护所", warpId: "Night_Shelter", anyDoorCode: "Night_Shelter" },
			{ name: "藏星阁", warpId: "Night_IPHallway", anyDoorCode: "Night_IPHallway" },
			{ name: "月牙绿洲", warpId: "Night_PaintedWorld", anyDoorCode: "Night_PaintedWorld" },
			{ name: "姆明谷的森林", warpId: "Night_ValleyForest", anyDoorCode: "Night_ValleyForest" },
			{ name: "姆明屋", warpId: "Night_ValleyHouse", anyDoorCode: "Night_ValleyHouse" },
			{ name: "姆明天空屋", warpId: "Night_ValleyHouseSky", anyDoorCode: "Night_ValleyHouseSky" },
			{ name: "月圆之地", warpId: "Event_DaysOfMoonlight_HugeMoon", anyDoorCode: "Event_DaysOfMoonlight_HugeMoon" },
			{ name: "残灯墟", warpId: "Night_Jumble", anyDoorCode: "Night_Jumble" },
			{ name: "织光阁", warpId: "Night_Workshop", anyDoorCode: "Night_Workshop" },
			{ name: "虚空", warpId: "Season24Void1", anyDoorCode: "Season24Void1" },
			{ name: "姆明故事书", warpId: "Night_StoryBook", anyDoorCode: "Night_StoryBook" },
			{ name: "梵高城市", warpId: "Night_GO_City", anyDoorCode: "Night_GO_City" },
			{ name: "梵高农场", warpId: "Night_GO_Farm", anyDoorCode: "Night_GO_Farm" },
			{ name: "梵高麦田", warpId: "Night_GO_Field", anyDoorCode: "Night_GO_Field" },
			{ name: "梵高画廊", warpId: "Night_GO_Gallery", anyDoorCode: "Night_GO_Gallery" },
			{ name: "梵高岛屿", warpId: "Night_GO_Island", anyDoorCode: "Night_GO_Island" },
			{ name: "梵高小镇", warpId: "Night_GO_Town", anyDoorCode: "Night_GO_Town" },
			{ name: "梵高树木", warpId: "Night_GO_Tree", anyDoorCode: "Night_GO_Tree" },



		]
	},
	yidian: {
		name: "伊甸",
		spots: [
			{ name: "伊甸入口", warpId: "StormStart", anyDoorCode: "StormStart" },
			{ name: "伊甸", warpId: "Storm", anyDoorCode: "Storm" },
			{ name: "伊甸之眼", warpId: "StormEnd", anyDoorCode: "StormEnd" },
			{ name: "重生之路", warpId: "OrbitMid", anyDoorCode: "OrbitMid" },
			{ name: "重生之路终点", warpId: "OrbitEnd", anyDoorCode: "OrbitEnd" },
			{ name: "星光大道", warpId: "CandleSpaceEnd", anyDoorCode: "CandleSpaceEnd" },
			{ name: "结尾动画", warpId: "Credits", anyDoorCode: "Credits" },
			{ name: "远古记忆", warpId: "StormEvent_VoidSpace", anyDoorCode: "StormEvent_VoidSpace" },
			{ name: "AR 相机测试图", warpId: "AR_TestLevel", anyDoorCode: "AR_TestLevel" },
			{ name: "空世界", warpId: "WorldEmpty", anyDoorCode: null },
		]
	}
}
