export type RealityEventType = 'common' | 'danger' | 'combat' | 'welfare' | 'relic' | 'anomaly';

export interface EventChoice {
  text: string;
  requirements?: Record<string, number>;
  results: {
    stats?: {
      hp?: number;
      food?: number;
      energy?: number;
      sanity?: number;
    };
    items?: Record<string, number>;
    logText: string;
  };
}

export interface RealityEvent {
  id: string;
  title: string;
  description: string;
  type: RealityEventType;
  choices: {
    A: EventChoice;
    B: EventChoice;
  };
  weight?: number; // 出现权重，不填默认为 100
}

export const REALITY_EVENTS: Record<string, RealityEvent> = {
  // --- 1. 废土物资 (Common) ---
  ruined_truck: {
    id: "ruined_truck",
    title: "废弃的魔导卡车",
    description: "路边倒扣着一辆锈迹斑斑的魔导运输卡车，底盘上隐约有莹光闪烁。车门半开，里面可能有遗落的物资，但也有可能有变异的辐射蛛群寄生。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "仔细搜寻车厢 (饱食-8)",
        results: {
          stats: { food: -8 },
          items: { scrap_metal: 3, seed_glow_grass: 1 },
          logText: "你钻入车厢，撬开了储物舱。虽然弄了一身铁锈，但也找到了几块废铁和一颗荧光草种子。"
        }
      },
      B: {
        text: "绕开卡车安全离开",
        results: {
          logText: "你警惕地绕过了倾覆的卡车。直觉告诉你，废土上的任何未知角落都可能隐藏着致命危险。"
        }
      }
    }
  },
  rusty_safe: {
    id: "rusty_safe",
    title: "魔导保险箱",
    description: "在瓦砾堆里，你半埋着一个厚重的金属保险箱。上面的魔导密码锁已经坏了，但你可以尝试强行撬开，或者消耗一点魔力能量溶解它。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "用废金属撬棍强撬 (饱食-8)",
        results: {
          stats: { food: -8 },
          items: { scrap_metal: 1, seed_steel_sunflower: 1 },
          logText: "你费了些力气，终于撬开了这只箱子。里面有一颗神奇的钢纹向日葵种子。"
        }
      },
      B: {
        text: "使用魔能超频熔毁 (魔能-8)",
        results: {
          stats: { energy: -8 },
          items: { scrap_metal: 2, dream_shard: 1 },
          logText: "你引导体内的魔能超频运作，手掌散发出炽热的光束熔断了锁扣。里面除了废铁，还有一块纯净的梦境碎片。"
        }
      }
    }
  },

  // --- 2. 生化异变 (Danger) ---
  toxic_swamp: {
    id: "toxic_swamp",
    title: "酸雨腐蚀沼泽",
    description: "前方是一片被酸雨长年累月腐蚀的毒素沼泽，泥浆中泛着刺鼻的黄绿色气泡。强行蹚过可能会受伤，但能节省时间并可能发现遗留在底部的奇异植物种子。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "强行蹚过沼泽 (生命-10)",
        results: {
          stats: { hp: -10 },
          items: { seed_plasma_pumpkin: 1, alloy_plate: 1 },
          logText: "你咬紧牙关从小腿深的腐蚀泥浆中穿过，防护服被酸液灼烧得咝咝作响。但在废墟里捞到了一个密封盒，里面有一颗种子和金属板。"
        }
      },
      B: {
        text: "安全绕行毒沼 (饱食-10)",
        results: {
          stats: { food: -10 },
          logText: "你选择花费更多时间从沼泽边缘绕过去。饱食度下降，但好在没有受伤。"
        }
      }
    }
  },
  military_caches: {
    id: "military_caches",
    title: "报废的自动机炮",
    description: "一尊古老的自动防卫机炮歪倒在地上。它的识别模块已彻底损毁，但其弹药箱和电池仓似乎还保存完好，并且有辐射泄露。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "暴力拆卸电池仓 (生命-6, 饱食-6)",
        results: {
          stats: { hp: -6, food: -6 },
          items: { plasma_cell: 1, scrap_metal: 2 },
          logText: "你用撬棍砸开电池仓。耀眼的电火花让你轻微电击，但也成功拿到了一个等离子电芯和两块废金属。"
        }
      },
      B: {
        text: "魔能溶解安全锁 (魔能-10)",
        results: {
          stats: { energy: -10 },
          items: { plasma_cell: 2 },
          logText: "你小心引导魔能烧毁了电子锁。外壳弹开，你安全地拿到了两个等离子电芯。"
        }
      }
    }
  },

  // --- 3. 废土御敌 (Combat) ---
  mutant_beast: {
    id: "mutant_beast",
    title: "荒野变异犬",
    description: "一只皮毛脱落、双眼赤红的变异野狗突然从断墙后窜了出来，呲着钢针般的獠牙对你低吼。它看起来极度饥饿，正准备把你当成美餐。",
    type: "combat",
    weight: 60,
    choices: {
      A: {
        text: "用魔能震荡击退 (生命-10, 魔能-8)",
        results: {
          stats: { hp: -10, energy: -8 },
          items: { ration: 2 },
          logText: "你激发魔导枪发出一记震荡波。怪兽哀鸣着被击飞，垂死挣扎撕破了防化服。你割下了两份尚能食用的异兽肉。"
        }
      },
      B: {
        text: "丢出诱饵强制逃跑 (需口粮x1)",
        requirements: { ration: 1 },
        results: {
          items: { ration: -1 },
          logText: "你迅速从怀里掏出一包口粮扔了过去。野狗扑向食物，你趁机飞快地逃离了现场。"
        }
      }
    }
  },

  // --- 4. 营地休整 (Welfare) ---
  cozy_hotspring: {
    id: "cozy_hotspring",
    title: "地底温热泉水",
    description: "在幽暗的地下溶洞中，有一汪清澈见底的温热泉水，正腾腾地冒着白气。水波温和地拍打着岩壁，这是一个不可思议的安详港湾。",
    type: "welfare",
    weight: 40,
    choices: {
      A: {
        text: "浸泡温泉放松 (生命+15, 饱食+5)",
        results: {
          stats: { hp: 15, food: 5 },
          logText: "你在温暖舒适的泉水里泡了一会儿。连日来的疲惫一扫而空，甚至感觉身体力量有些微恢复。"
        }
      },
      B: {
        text: "灌装泉水带走 (获能量补充剂x1)",
        results: {
          items: { energy_refill: 1 },
          logText: "你掏出空瓶，灌装了一满瓶充满高能矿物质和微量魔导活性的泉水，完美制成了一剂能量补充剂。"
        }
      }
    }
  },
  abandoned_camp: {
    id: "abandoned_camp",
    title: "废弃避难所营地",
    description: "你发现了一处被废弃不久的地面临时营地，周围搭着厚实的防风帆布。四周静悄悄的，大部分日常家具还留在原处。",
    type: "welfare",
    weight: 40,
    choices: {
      A: {
        text: "搜刮储藏箱 (获口粮x2, 废铁x2)",
        results: {
          items: { ration: 2, scrap_metal: 2 },
          logText: "在一口密封完好的木箱里，你翻到了两袋旧世压缩口粮和两件沉甸甸的废金属零件！"
        }
      },
      B: {
        text: "在简易床上小憩 (生命+10, 理智+10)",
        results: {
          stats: { hp: 10, sanity: 10 },
          logText: "你躺在虽然落满灰尘但足够舒适的床垫上打了个盹。你的身体和精神都得到了极大的休息。"
        }
      }
    }
  },

  // --- 5. 古代遗迹 (Relic) ---
  ancient_library: {
    id: "ancient_library",
    title: "大图书馆遗迹",
    description: "你走入了一间早已半塌的古代图书馆。大部分书架已经腐烂成灰，但在密闭的金属阅读隔间里，仍有少许未风化的藏书。",
    type: "relic",
    weight: 50,
    choices: {
      A: {
        text: "翻阅诗歌残本 (理智+12, 获碎片x1)",
        results: {
          stats: { sanity: 12 },
          items: { dream_shard: 1 },
          logText: "里面精美的诗句安抚了你紧绷的理智，并在你的精神深处凝结成了一块晶莹的梦境碎片。"
        }
      },
      B: {
        text: "拆解阅读架 (饱食-5, 获合金板x2)",
        results: {
          stats: { food: -5 },
          items: { alloy_plate: 2 },
          logText: "你熟练地用工具卸下了两块完好无损的名贵抗辐射合金板。"
        }
      }
    }
  },
  mysterious_capsule: {
    id: "mysterious_capsule",
    title: "神秘冷冻休眠舱",
    description: "一具厚重的科幻金属舱体半掩在流沙中。虽然冷冻对象早已离世，但其紧急医疗储备和电池似乎还处于密闭状态。",
    type: "relic",
    weight: 50,
    choices: {
      A: {
        text: "破拆舱门 (饱食-10, 获纳米针x1)",
        results: {
          stats: { food: -10 },
          items: { nanite_injector: 1 },
          logText: "你用撬棍砸开阀门。在气压释放声中，你找到了一支真空包装下的纳米修复针！"
        }
      },
      B: {
        text: "短路供电 (魔能-10, 获护盾电池x1)",
        results: {
          stats: { energy: -10 },
          items: { shield_battery: 1 },
          logText: "舱盖缓缓打开，你从备用电容中拆卸出了一节完好的重载护盾电池。"
        }
      }
    }
  },

  // --- 6. 异常天气 (Anomaly) ---
  acid_rain_storm: {
    id: "acid_rain_storm",
    title: "突发魔能酸雨",
    description: "天空突然变成了诡异的暗紫色，带电的雨滴开始淅淅沥沥地砸落，并在地表腐蚀出刺鼻的白烟。这是致命的魔能酸雨风暴，你需要立刻决定对策。",
    type: "anomaly",
    weight: 80,
    choices: {
      A: {
        text: "找废墟躲避 (饱食-8)",
        results: {
          stats: { food: -8 },
          items: { scrap_metal: 2 },
          logText: "你躲进大楼中等待雨停。饱食度流逝，闲着无聊你在杂物堆里翻出了两件废铁。"
        }
      },
      B: {
        text: "护盾硬顶前进 (魔能-12, 获碎片x1)",
        results: {
          stats: { energy: -12 },
          items: { dream_shard: 1 },
          logText: "你将魔能注入护盾硬顶酸雨。你在地表凹槽中发现了一枚晶莹的梦境碎片。"
        }
      }
    }
  },
  radiation_leak: {
    id: "radiation_leak",
    title: "高浓度魔能辐射带",
    description: "前方的谷地中飘浮着幽绿的雾气，这是灾变时魔能管道碎裂残留的高能辐射气团。直接穿过去可能会受重伤，但这是通往废墟深处的捷径。",
    type: "anomaly",
    weight: 80,
    choices: {
      A: {
        text: "激发过滤盾 (魔能-10, 获碎片x1)",
        results: {
          stats: { energy: -10 },
          items: { dream_shard: 1, scrap_metal: 2 },
          logText: "你成功穿过了绿雾，顺手在废墟残骸中撬下几块金属板，并捡到了一枚梦境碎片。"
        }
      },
      B: {
        text: "绕道而行 (饱食-10, 生命-3)",
        results: {
          stats: { food: -10, hp: -3 },
          logText: "你选择翻山绕过这片毒雾。寒冷的地表风沙让生命值受到些许损伤，并消耗了体力。"
        }
      }
    }
  }
};
