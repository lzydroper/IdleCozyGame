import type { RealityEvent } from './realityEvents';

export const RESCUE_EVENTS: Record<string, RealityEvent> = {
  rescue_roy: {
    id: "rescue_roy", title: "雷达站：营救罗伊",
    description: "在破碎的雷达阵列控制舱中，你发现了饥寒交迫的工程师罗伊。然而，废墟的阴暗处有一只高能辐射蝎挡在门口嘶吼！你可以部署防御电磁塔击杀它，或者超频护盾顶着攻击冲过去。",
    type: "combat",
    choices: {
      A: { text: "部署防御炮塔消灭怪兽 (需炮塔x1, 生命-10)", requirements: { defensive_turret: 1 }, results: { stats: { hp: -10 }, items: { defensive_turret: -1 }, logText: "你快速部署了防御炮塔，激发的电磁炮击碎了蝎子的外壳，但余波也震裂了你的防化服。你成功背起罗伊！" } },
      B: { text: "使用能量补充剂强突 (需补充剂x2, 生命-20)", requirements: { energy_refill: 2 }, results: { stats: { hp: -20 }, items: { energy_refill: -2 }, logText: "你启动双份能量补充剂强开电荷屏障，硬扛着蝎毒的腐蚀将罗伊抱走，乘升降机成功脱险！" } }
    }
  },
  rescue_mei: {
    id: "rescue_mei", title: "温室废墟：营救阿梅",
    description: "在坍塌的古代魔导温室深处，阿梅被带毒的发光寄生藤蔓死死卷在空中，已经处于半昏迷状态。你必须熔断藤蔓救她，或者喂食压缩口粮给她提供能量挣脱藤蔓。",
    type: "danger",
    choices: {
      A: { text: "魔能超频熔毁藤蔓 (魔能-30)", results: { stats: { energy: -30 }, logText: "你将魔导拳超频，爆发出一圈炽热弧光烧断了毒藤，接住了掉落的阿梅。营救成功！" } },
      B: { text: "喂食口粮提供体力 (需口粮x3)", requirements: { ration: 3 }, results: { items: { ration: -3 }, logText: "你用刀片切开一线藤蔓，将三份压缩口粮喂给阿梅。她恢复了体力配合你的拉扯扯断了藤蔓！" } }
    }
  },
  rescue_zero: {
    id: "rescue_zero", title: "信号塔：营救 Zero",
    description: "Zero 在信号塔顶部被一群高速移动的废土电磁黄蜂包围，腿部严重骨折。黄蜂发出的静电风暴极其剧烈，你必须部署防御炮塔，或者超频护盾顶着电弧突击。",
    type: "combat",
    choices: {
      A: { text: "部署电磁防御塔掩护 (需炮塔x1)", requirements: { defensive_turret: 1 }, results: { items: { defensive_turret: -1 }, logText: "你掷出炮塔形成诱饵雷区，引走了疯狂的金属黄蜂，成功滑索将 Zero 救下！" } },
      B: { text: "硬扛静电防护网强冲 (生命-25, 魔能-20)", results: { stats: { hp: -25, energy: -20 }, logText: "你强开防护盾，顶着万伏高压电弧的撕咬，强行撕开黄蜂群背起 Zero 滑降！" } }
    }
  },
  rescue_catherine: {
    id: "rescue_catherine", title: "生化实验室：营救凯瑟琳",
    description: "实验室里弥漫着毒气，凯瑟琳医生被一群魔化辐射老鼠包围在配药舱内。你可以使用纳米修复针强攻，或者用魔能超频强熔溶解锁。",
    type: "danger",
    choices: {
      A: { text: "使用纳米修复针破除大门 (需纳米针x1, 生命-10)", requirements: { nanite_injector: 1 }, results: { stats: { hp: -10 }, logText: "你快速使用纳米修复针打破封锁并保护凯瑟琳，虽然防化服被毒气微量腐蚀，但成功救出！" } },
      B: { text: "魔能超频强熔溶解锁 (生命-20, 魔能-35)", results: { stats: { hp: -20, energy: -35 }, logText: "你强开魔能高热熔断锁孔，在变异鼠群合围前破门而入，成功救出凯瑟琳！" } }
    }
  },
  rescue_buster: {
    id: "rescue_buster", title: "坍塌地铁站：营救巴斯特",
    description: "地铁站月台半塌陷，巴斯特的腿被碎石死死压住，而黑暗的隧道深处传来变异掘墓兽的沉重咆哮声。你需要部署防御炮塔，或者强行肉搏拉人。",
    type: "combat",
    choices: {
      A: { text: "部署防御炮塔压制怪物 (需防御炮塔x1)", requirements: { defensive_turret: 1 }, results: { logText: "你迅速部署炮塔建立防线。强烈的电磁火花在隧道中爆发，你趁机用铁锹撬开碎石，救出巴斯特！" } },
      B: { text: "肉搏变异体强行拉人 (生命-35, 魔能-15)", results: { stats: { hp: -35, energy: -15 }, logText: "你丢开武器徒手推开巨石。狂暴的怪兽撕咬伤了你的侧腹，但你强忍重伤背起巴斯特脱离了地铁站！" } }
    }
  },
  rescue_nova: {
    id: "rescue_nova", title: "军火库：营救诺娃",
    description: "诺娃被困在受辐射的报废魔导机甲驾驶舱内，机甲核心已经处于临界过载的边缘，极度危险！你需要使用重载护盾电池稳定磁场，或者超频暴力破拆机甲。",
    type: "danger",
    choices: {
      A: { text: "使用重载护盾电池稳定磁场 (需护盾电池x1)", requirements: { shield_battery: 1 }, results: { logText: "你抛出重载护盾电池。柔和的能量磁场稳定了机甲核心，驾驶舱盖自动弹开，你成功扶出诺娃！" } },
      B: { text: "超频砸开驾驶舱 (生命-25, 魔能-30)", results: { stats: { hp: -25, energy: -30 }, logText: "你魔能超频，一拳一拳强行砸烂了防爆座舱玻璃，抢在机甲核心殉爆前将诺娃拖出！" } }
    }
  },
  rescue_soldier: {
    id: "rescue_soldier", title: "废弃制药厂：营救铁卫",
    description: "制药厂的废墟深处，一名身披重甲的高大守卫者被压在一根钢筋横梁下，四周弥漫着生化毒雾，变异鼠群正在逼近。你要部署防御炮塔击杀鼠群，或者硬扛毒雾救人。",
    type: "combat",
    choices: {
      A: { text: "部署防御炮塔清场 (需炮塔x1, 生命-10)", requirements: { defensive_turret: 1 }, results: { stats: { hp: -10 }, items: { defensive_turret: -1 }, logText: "你迅速部署炮塔形成电磁屏障，击退了鼠群。你撬开横梁救出了铁卫，他沉默但坚定地加入了你的队伍！" } },
      B: { text: "硬扛毒雾强攻救人 (生命-25, 魔能-20)", results: { stats: { hp: -25, energy: -20 }, logText: "你启动护盾冲入毒雾，双臂发力将横梁扛起。铁卫脱困后撕下衣角为你包扎伤口，眼中满是感激。" } }
    }
  },
  rescue_healer: {
    id: "rescue_healer", title: "坍塌军械库：营救艾拉",
    description: "军械库内布满倒塌的金属武器架，药剂师艾拉被压在一根倒塌的承重柱旁边，她的药箱散落一地，腿部流着血。你需要修复支撑结构，或者强行破拆救人。",
    type: "danger",
    choices: {
      A: { text: "使用纳米修复针稳定伤势 (需纳米针x1)", requirements: { nanite_injector: 1 }, results: { items: { nanite_injector: -1 }, logText: "你用纳米修复针为艾拉止血。她恢复行动力后与你配合撬开了压住她的柱子，你搀扶着她离开了军械库。" } },
      B: { text: "魔能超频举起柱子 (生命-15, 魔能-25)", results: { stats: { hp: -15, energy: -25 }, logText: "你咬牙催动魔能，双掌爆发出炽热的光芒将柱子硬生生抬起。艾拉在最后一刻滚了出来，你们两人都筋疲力尽。" } }
    }
  },
  rescue_apprentice: {
    id: "rescue_apprentice", title: "旧世图书馆：营救小米",
    description: "图书馆的巨型书架在地震中倾倒，一名看起来还十分年轻的拾荒者小米被卡在倒塌的书架和墙壁之间。她紧紧抱着一本旧世古籍，眼中充满恐惧。你需要清理障碍，或者引导她自行钻出。",
    type: "danger",
    choices: {
      A: { text: "用口粮诱她钻出缝隙 (需口粮x3)", requirements: { ration: 3 }, results: { items: { ration: -3 }, logText: "你掏出三包口粮，撕开包装让香味飘进去。小米犹豫片刻后终于钻了出来，接过口粮狼吞虎咽。她感激地跟你走了。" } },
      B: { text: "魔能震开书架 (魔能-30)", results: { stats: { energy: -30 }, logText: "你释放魔能冲击波震碎了卡住她的书架。小米被碎裂的木屑呛得直咳，但她抱紧古籍冲你露出了微笑。" } }
    }
  }
};

export const RESCUE_LOCATION_MAP: Record<string, string> = {
  radar_station: 'rescue_roy',
  green_ruins: 'rescue_mei',
  signal_tower: 'rescue_zero',
  bio_lab: 'rescue_catherine',
  collapsed_subway: 'rescue_buster',
  military_depot: 'rescue_nova',
  poison_factory: 'rescue_soldier',
  ruined_armory: 'rescue_healer',
  ancient_library: 'rescue_apprentice',
};
