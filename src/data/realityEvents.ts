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
  choices: {
    A: EventChoice;
    B: EventChoice;
  };
}

export const REALITY_EVENTS: Record<string, RealityEvent> = {
  ruined_truck: {
    id: "ruined_truck",
    title: "废弃的魔导卡车",
    description: "路边倒扣着一辆锈迹斑斑的魔导运输卡车，底盘上隐约有莹光闪烁。车门半开，里面可能有遗落的物资，但也有可能有变异的辐射蛛群寄生。",
    choices: {
      A: {
        text: "仔细搜寻车厢 (饱食-10)",
        results: {
          stats: { food: -10 },
          items: { scrap_metal: 3, seed_glow_grass: 1 },
          logText: "你强忍饥饿钻入车厢，撬开了储物舱。虽然弄了一身铁锈，但也找到了几块废铁和一颗荧光草种子。"
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
  radiation_leak: {
    id: "radiation_leak",
    title: "高浓度魔能辐射带",
    description: "前方的谷地中飘浮着幽绿的雾气，这是灾变时魔能管道碎裂残留的高能辐射气团。直接穿过去可能会受重伤，但这是通往废墟深处的捷径。",
    choices: {
      A: {
        text: "激发魔能过滤盾 (魔能-15)",
        results: {
          stats: { energy: -15 },
          items: { dream_shard: 1, scrap_metal: 2 },
          logText: "你启动防护服的过滤结界。随着魔能急速消耗，你成功穿过了绿雾，顺手在废墟残骸中撬下几块金属板，并捡到了一枚亮晶晶的梦境碎片。"
        }
      },
      B: {
        text: "花时间绕道而行 (饱食-15, 生命-5)",
        results: {
          stats: { food: -15, hp: -5 },
          logText: "你选择翻山绕过这片毒雾。漫长的跋涉消耗了大量体力，寒冷的地表风沙也让你的生命值受到些许损伤。"
        }
      }
    }
  },
  mutant_beast: {
    id: "mutant_beast",
    title: "荒野变异犬",
    description: "一只皮毛脱落、双眼赤红的变异野狗突然从断墙后窜了出来，呲着钢针般的獠牙对你低吼。它看起来极度饥饿，正准备把你当成美餐。",
    choices: {
      A: {
        text: "用魔能震荡击退 (生命-15, 魔能-10)",
        results: {
          stats: { hp: -15, energy: -10 },
          items: { ration: 2 },
          logText: "你激发魔导枪发出一记震荡波。怪兽哀鸣着被击飞，但垂死挣扎也撕破了你的防化服。你从其身上割下了两份尚能食用的异兽肉。"
        }
      },
      B: {
        text: "丢出诱饵强制逃跑 (消耗口粮x1)",
        requirements: { ration: 1 },
        results: {
          items: { ration: -1 },
          logText: "你迅速从怀里掏出一包口粮扔了过去。野狗扑向食物，你趁机飞快地逃离了现场。"
        }
      }
    }
  },
  rusty_safe: {
    id: "rusty_safe",
    title: "魔导保险箱",
    description: "在瓦砾堆里，你半埋着一个厚重的金属保险箱。上面的魔导密码锁已经坏了，但你可以尝试强行撬开，或者消耗一点魔力能量溶解它。",
    choices: {
      A: {
        text: "用废金属撬棍强撬 (饱食-10)",
        results: {
          stats: { food: -10 },
          items: { scrap_metal: 1, seed_steel_sunflower: 1 },
          logText: "你费了九牛二虎之力，甚至撬断了钢针，终于撬开了这只箱子。里面有一颗神奇的钢纹向日葵种子。"
        }
      },
      B: {
        text: "使用魔能超频熔毁 (魔能-12)",
        results: {
          stats: { energy: -12 },
          items: { scrap_metal: 2, dream_shard: 1 },
          logText: "你引导体内的魔能超频运作，手掌散发出炽热的光束熔断了锁扣。里面除了废铁，还有一块纯净的梦境碎片。"
        }
      }
    }
  },
  toxic_swamp: {
    id: "toxic_swamp",
    title: "酸雨腐蚀沼泽",
    description: "前方是一片被酸雨长年累月腐蚀的毒素沼泽，泥浆中泛着刺鼻的黄绿色气泡。强行蹚过可能会受伤，但能节省时间并可能发现遗留在底部的奇异植物种子；绕行则需要消耗大量体力。",
    choices: {
      A: {
        text: "强行蹚过沼泽 (生命-15)",
        results: {
          stats: { hp: -15 },
          items: { seed_plasma_pumpkin: 1, alloy_plate: 1 },
          logText: "你咬紧牙关从小腿深的腐蚀泥浆中穿过，防护服被酸液灼烧得咝咝作响，生命值受到损害。但你在沼泽中心的废墟里捞到了一个密封盒，里面有一颗等离子南瓜种子和一块合金金属板。"
        }
      },
      B: {
        text: "安全绕行毒沼 (饱食-15)",
        results: {
          stats: { food: -15 },
          logText: "你选择花费更多时间从沼泽边缘的坚硬岩石区绕过去。这极大地增加了体能消耗，你的饱食度明显下降，但好在没有受伤。"
        }
      }
    }
  },
  wandering_trader: {
    id: "wandering_trader",
    title: "黑市流浪商人",
    description: "一名身穿破旧防化斗篷、背着巨大金属箱的流浪商人在废墟阴影中向你招手。他声称自己手里有一些珍稀的温室变异植物种子，只接受废旧金属作为交换。",
    choices: {
      A: {
        text: "用废铁交换珍稀种子 (消耗废旧金属x5)",
        requirements: { scrap_metal: 5 },
        results: {
          items: { scrap_metal: -5, seed_magma_pepper: 2, seed_frost_bell: 1 },
          logText: "你拿出5个废旧金属零件递给商人。商人露出了满意的笑容，从怀里摸出两颗熔岩椒种子和一颗霜冻风铃草种子作为回报。"
        }
      },
      B: {
        text: "拒绝交易离开 (饱食-2)",
        results: {
          stats: { food: -2 },
          logText: "你警惕地拒绝了他的交易，并迅速离开。由于绕路防范商人的跟踪，你消耗了少许饱食度。"
        }
      }
    }
  },
  military_caches: {
    id: "military_caches",
    title: "报废的自动机炮",
    description: "在废弃的哨所旁，一尊古老的自动防卫机炮歪倒在地上。它的识别模块已彻底损毁，但其弹药箱和电池仓似乎还保存完好，你可以尝试用魔能熔毁锁扣，或者直接暴力拆卸。",
    choices: {
      A: {
        text: "暴力拆卸电池仓 (生命-10, 饱食-10)",
        results: {
          stats: { hp: -10, food: -10 },
          items: { plasma_cell: 1, scrap_metal: 3 },
          logText: "你用工坊撬棍对准电池仓的缝隙狠狠砸了下去。随着一阵耀眼的电火花，你被轻微电击并消耗了大量体力，但也成功拿到了一个等离子电芯和几块废金属。"
        }
      },
      B: {
        text: "魔能溶解安全锁 (魔能-15)",
        results: {
          stats: { energy: -15 },
          items: { plasma_cell: 2 },
          logText: "你小心翼翼地引导魔能渗透进机炮的电子安全锁，将内部芯片烧毁。外壳自动弹开，你安全地拿到了两个等离子电芯。"
        }
      }
    }
  },
  gravitational_anomaly: {
    id: "gravitational_anomaly",
    title: "重力异常废墟",
    description: "前方的重工业区废墟中存在一处小型的重力异常扭曲场，碎石和金属废料在空中无规律地漂浮着。在残骸深处，隐约闪烁着罕见的结晶光芒。",
    choices: {
      A: {
        text: "激活魔能护盾探索 (魔能-18)",
        results: {
          stats: { energy: -18 },
          items: { frost_crystal: 2, dream_shard: 1 },
          logText: "你利用魔能护盾包裹全身，隔绝了重力扭曲对身体的挤压。你穿梭于悬浮的废墟间，顺利采掘到两枚冰晶结晶以及一块散落的梦境碎片。"
        }
      },
      B: {
        text: "徒手爬过异常区 (生命-12, 饱食-12)",
        results: {
          stats: { hp: -12, food: -12 },
          items: { frost_crystal: 1, scrap_metal: 2 },
          logText: "你在失重与超重交替的碎石之间攀爬前进，几块悬空的钢板突然砸来，让你受了伤，且非常疲惫。最终，你勉强捡到了一枚冰晶结晶和一些废旧金属。"
        }
      }
    }
  },
  broken_greenhouse: {
    id: "broken_greenhouse",
    title: "废弃魔导水培室",
    description: "一间在大灾变中半毁的水培温室静静矗立在路旁。这里的自动培育架早已停转，但某些防爆培育槽可能还有未孵化的种子，供电板上也有些残留零件。",
    choices: {
      A: {
        text: "搜寻水培控制台 (饱食-10)",
        results: {
          stats: { food: -10 },
          items: { seed_void_lotus: 1, seed_glow_grass: 2 },
          logText: "你仔细搜寻培育台下方的种子冷藏箱。在消耗了不少体力后，你成功取出了一个保存状态良好的虚空魔莲种子和两颗普通的荧光草种子。"
        }
      },
      B: {
        text: "拆卸紧急供电板 (生命-5, 魔能-10)",
        results: {
          stats: { hp: -5, energy: -10 },
          items: { alloy_plate: 2 },
          logText: "你引导微量魔力逆向给供电板放电，但在强行拆卸时被高压电火花烫伤。不过，你还是成功拆下了两块厚实的合金金属板。"
        }
      }
    }
  },
  acid_rain_storm: {
    id: "acid_rain_storm",
    title: "突发魔能酸雨",
    description: "天空突然变成了诡异的暗紫色，带电的雨滴开始淅淅沥沥地砸落，并在地表腐蚀出刺鼻的白烟。这是致命的魔能酸雨风暴，你需要立刻决定对策。",
    choices: {
      A: {
        text: "就近找废墟躲避 (饱食-15)",
        results: {
          stats: { food: -15 },
          items: { scrap_metal: 2 },
          logText: "你躲进一栋破损的水泥大楼中。在等待酸雨停息的漫长时间里，你的饱食度不断流逝。闲着无聊，你在楼内杂物堆里顺手翻出了两件废铁。"
        }
      },
      B: {
        text: "超频护盾硬顶雨前进 (魔能-20)",
        results: {
          stats: { energy: -20 },
          items: { dream_shard: 1 },
          logText: "你将魔能注入防护衣，让魔能护盾在头顶形成一道防御光幕。你虽然在雨中全速前进，极大地消耗了魔能，但在被雨水冲刷的地表凹槽中发现了一枚晶莹的梦境碎片。"
        }
      }
    }
  }
};
