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
  },

  // ========== 新增事件 ==========

  // --- 1. 废土物资 (Common) 新增 ---
  abandoned_train: {
    id: "abandoned_train",
    title: "废弃货运列车",
    description: "一列锈蚀的货运列车横卧在铁轨上，运输车厢门半掩，里面堆满了腐朽的木箱。车头驾驶室的仪表盘上似乎还有微弱的指示灯在闪烁。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "暴力砸开货运车厢 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { alloy_plate: 2, scrap_metal: 3 },
          logText: "你一撬棍砸开了木箱，虽然里面大部分物资已经腐烂，但找到了几块完好的防辐射合金板和一堆可熔炼的废金属。"
        }
      },
      B: {
        text: "检查驾驶室 (魔能-6)",
        results: {
          stats: { energy: -6 },
          items: { plasma_cell: 1, scrap_metal: 1 },
          logText: "驾驶台还有残存的电力，你熟练地拆下了车载辅助电源中的等离子电芯，顺手薅了一把废铁。"
        }
      }
    }
  },
  broken_greenhouse: {
    id: "broken_greenhouse",
    title: "废弃温室大棚",
    description: "一座半塌的农用温室隐藏在断壁之间，玻璃顶棚早已碎裂，但内部的一些种植槽还保持着相对完整的形态，野生的变异植物在其中肆意生长。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "翻找旧苗床 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { seed_glow_grass: 1, seed_aether_berry: 1 },
          logText: "你扒开厚厚的腐殖层，惊喜地在苗床深处找到了几粒密封完好的旧世种子——一颗荧光草种子和一颗以太浆果种子！"
        }
      },
      B: {
        text: "拆解大棚框架 (饱食-4)",
        results: {
          stats: { food: -4 },
          items: { scrap_metal: 3, glow_fiber: 1 },
          logText: "你利落地拆卸着大棚的金属支架，在缠绕的藤蔓间还扯下了一捆可用的荧光草纤维。"
        }
      }
    }
  },
  supply_crate: {
    id: "supply_crate",
    title: "被遗弃的军用补给箱",
    description: "路边倒着一个墨绿色的军用合金补给箱，虽然外壳被啃咬得坑坑洼洼，但锁定机构依然完好。箱体上印着一行模糊的编号和一把电子密码锁。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "用魔能感应破译密码 (魔能-6)",
        results: {
          stats: { energy: -6 },
          items: { ration: 2, dream_shard: 1 },
          logText: "你集中精神，将魔能探入锁芯感知机械结构。咔嗒一声，锁开了！里面整齐码放着两包压缩口粮，底部还压着一块晶莹的梦境碎片。"
        }
      },
      B: {
        text: "用撬棍强行撬开 (饱食-6, 生命-3)",
        results: {
          stats: { food: -6, hp: -3 },
          items: { ration: 1, alloy_plate: 1 },
          logText: "你靠着蛮力将箱盖撬开一道缝，手指被锋利的铁皮划伤。里面只有一包口粮和一块合金板还算完好。"
        }
      }
    }
  },
  abandoned_cart: {
    id: "abandoned_cart",
    title: "废弃三轮运输车",
    description: "一辆破旧的废土三轮车侧翻在沟渠里，货斗用防雨布盖着，鼓鼓囊囊的似乎装着什么东西。车身虽然锈迹斑斑，但轮胎竟然还有气压。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "翻开防雨布检查货斗 (饱食-4)",
        results: {
          stats: { food: -4 },
          items: { scrap_metal: 2, glow_fiber: 1 },
          logText: "你掀开防水布，里面装着几块废铁和一团荧光草纤维——虽然不值钱，但至少没白费力气。"
        }
      },
      B: {
        text: "拆卸轮胎与零件 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { alloy_plate: 1, aether_pulp: 1 },
          logText: "你花了不少功夫卸下轮胎和内胎，橡胶居然还能用，并且在座椅下发现了一罐密封的以太果肉。"
        }
      }
    }
  },

  // --- 2. 生化异变 (Danger) 新增 ---
  fungus_nest: {
    id: "fungus_nest",
    title: "变异真菌巢穴",
    description: "一处废弃地下室的入口处长满了奇异的发光菌类，紫色的菌丝如血管般蔓延到墙壁上，空气中弥漫着甜腻而令人头晕的孢子味。菌群深处似乎有什么物资箱的影子。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "用防护服隔离采集 (饱食-8, 生命-4)",
        results: {
          stats: { food: -8, hp: -4 },
          items: { aether_pulp: 2, void_essence: 1 },
          logText: "你拉紧兜帽和面罩，屏住呼吸冲入菌群深处。皮肤暴露处传来刺痛，但你在废料堆中成功采集到了两团以太果肉和一瓶虚空精华。"
        }
      },
      B: {
        text: "远距离魔能焚烧 (魔能-10)",
        results: {
          stats: { energy: -10 },
          items: { mana_dust: 3, scrap_metal: 1 },
          logText: "你引导魔能火焰喷向菌丝巢穴，荧光的菌群在高温中卷曲焦化。火焰过后除了满地灰烬，你还在灰烬中扒拉出了一捧魔能之尘和一块融化的废铁。"
        }
      }
    }
  },
  waste_pool: {
    id: "waste_pool",
    title: "腐蚀性化工废料池",
    description: "前方洼地里积着一潭散发着刺鼻酸味的化工废液，池面浮着七彩的油膜，不断冒着白色的腐蚀性烟雾。废液底部隐约可见一些耐腐蚀的金属容器。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "用长杆绑工具打捞 (饱食-8, 生命-5)",
        results: {
          stats: { food: -8, hp: -5 },
          items: { plasma_cell: 1, alloy_plate: 1 },
          logText: "你找了根长杆绑上钩爪，小心地探入废液中钩捞。飞溅的液滴烧穿了你的袖口，但你成功捞上来一个密封的合金容器，里面装着一枚等离子电芯。"
        }
      },
      B: {
        text: "投放碱性中和剂后搜取 (魔能-8)",
        results: {
          stats: { energy: -8 },
          items: { scrap_metal: 3, steel_petal: 1 },
          logText: "你运用魔能在池边合成碱性物质投入废液，随着刺鼻的白烟散去，你从池底捡起了几块被腐蚀得坑坑洼洼的废金属和一瓣完好的钢纹花瓣。"
        }
      }
    }
  },
  thorn_thicket: {
    id: "thorn_thicket",
    title: "剧毒荆棘丛",
    description: "前方的道路被一丛丛暗红色的变异荆棘封锁，荆棘上长满了淬毒般的倒刺，缝隙间隐约可见散落的骸骨。但透过荆棘缝隙，似乎能看到另一侧有一些遗落的旧世箱柜。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "挥刀斩出一条路 (生命-8, 饱食-4)",
        results: {
          stats: { hp: -8, food: -4 },
          items: { aether_pulp: 2, frost_crystal: 1 },
          logText: "你挥舞砍刀硬生生劈开一条通道，荆棘倒刺划破了你的手臂。但箱子里的收获还算值得——以太果肉和一块冰晶结晶。"
        }
      },
      B: {
        text: "用魔能火焰焚烧开道 (魔能-8)",
        results: {
          stats: { energy: -8 },
          items: { scrap_metal: 2, mana_dust: 1 },
          logText: "你催动魔能释放出一道高温火弧，荆棘在烈焰中噼啪作响化为灰烬。你在灰烬堆旁捡到了废铁和残余的魔能之尘。"
        }
      }
    }
  },

  // --- 3. 废土御敌 (Combat) 新增 ---
  bat_swarm: {
    id: "bat_swarm",
    title: "变异蝠群袭击",
    description: "头顶突然传来刺耳的尖啸声，一大群双眼泛着红光的变异蝙蝠从废弃高楼的窗口倾巢而出，如同一片乌云般向你俯冲袭来，尖锐的利爪和獠牙在昏暗中闪烁寒光。",
    type: "combat",
    weight: 60,
    choices: {
      A: {
        text: "释放魔能冲击波驱散 (魔能-10, 生命-6)",
        results: {
          stats: { hp: -6, energy: -10 },
          items: { aether_pulp: 2, mana_dust: 1 },
          logText: "你大喝一声释放出环形的魔能冲击波，蝠群被震得七零八落在地上抽搐。你在蝙蝠巢穴下发现了它们囤积的以太果肉和魔能之尘。"
        }
      },
      B: {
        text: "匍匐隐蔽等待离开 (需口粮x1)",
        requirements: { ration: 1 },
        results: {
          items: { ration: -1, dream_shard: 1 },
          logText: "你迅速趴进一处浅沟，用口粮的包装袋盖住头部。蝠群在头顶呼啸而过，你侥幸躲过一劫。惊吓之余，你的精神力意外凝结出一块梦境碎片。"
        }
      }
    }
  },
  wasteland_bandits: {
    id: "wasteland_bandits",
    title: "废土劫匪埋伏",
    description: "三个衣衫褴褛但装备精良的劫匪从废墟后跳了出来，手中的电磁步枪已经充能完毕。其中为首者咧嘴露出黄牙：'过路费，小子。留下物资，饶你一命！'",
    type: "combat",
    weight: 60,
    choices: {
      A: {
        text: "先发制人反击 (生命-12, 魔能-8)",
        results: {
          stats: { hp: -12, energy: -8 },
          items: { scrap_metal: 3, ration: 1, mana_dust: 1 },
          logText: "你以迅雷之势轰出一记魔能震荡，三个劫匪被打了个措手不及。虽然你挂了彩，但他们的破烂物资现在都是你的了。"
        }
      },
      B: {
        text: "交出买路钱求和 (需废金属x3)",
        requirements: { scrap_metal: 3 },
        results: {
          items: { scrap_metal: -3 },
          logText: "你咬咬牙把三块废铁扔了过去。劫匪满意地捡起物资，吹着口哨散去。虽然安全了，但丢了三块好铁还是让你心痛不已。"
        }
      }
    }
  },
  giant_worm: {
    id: "giant_worm",
    title: "地下巨蠕虫",
    description: "脚下地面突然剧烈震动，你前方的地表轰然炸裂——一条卡车般粗壮的沙灰色巨蠕虫破土而出，张开布满螺旋利齿的巨口朝你扑来！它的体表流淌着诡异的岩浆纹路。",
    type: "combat",
    weight: 60,
    choices: {
      A: {
        text: "全速逃离现场 (饱食-10, 理智-6)",
        results: {
          stats: { food: -10, sanity: -6 },
          logText: "你头也不回地狂奔，身后巨蠕虫的嘶吼声震耳欲聋。跑出半公里后动静终于平息，你瘫坐在地上大口喘气，心理留下了不小的阴影。"
        }
      },
      B: {
        text: "部署炮塔诱捕击杀 (需防御炮塔x1)",
        requirements: { defensive_turret: 1 },
        results: {
          items: { defensive_turret: -1, magma_core: 1, aether_pulp: 3 },
          logText: "你迅速部署便携防御炮塔并后撤。炮塔开火的轰鸣和巨蠕虫的哀嚎交织在一起。战斗结束，你从虫尸残骸中挖出了一块熔岩核心碎片和多团以太果肉——一场豪赌般的收获！"
        }
      }
    }
  },

  // --- 4. 营地休整 (Welfare) 新增 ---
  hydrological_station: {
    id: "hydrological_station",
    title: "废弃水文监测站",
    description: "一座小型水文监测站孤零零地立在干涸的河床边，太阳能板虽然蒙尘但仍朝向天空，屋内的净化设备正发出微弱的低频嗡鸣——它居然还在运转。",
    type: "welfare",
    weight: 40,
    choices: {
      A: {
        text: "畅饮净化饮用水 (生命+10, 饱食+6)",
        results: {
          stats: { hp: 10, food: 6 },
          logText: "你拧开水龙头，清澈的水流哗哗涌出。你痛饮了一顿，还把水壶灌满。干净的水在废土上是奢侈的享受，你的身体和精神都得到了滋养。"
        }
      },
      B: {
        text: "拆卸备用净化滤芯 (获能量补充剂x1, 获净化血清x1)",
        results: {
          items: { energy_refill: 1, purifying_serum: 1 },
          logText: "你拆开设备仓，小心翼翼地取出了备用的反渗透滤芯和催化剂管——这些材料可以加工成一剂能量补充剂和一瓶净化血清。"
        }
      }
    }
  },
  wild_fruit: {
    id: "wild_fruit",
    title: "野生变异果丛",
    description: "你在向阳的山坡上发现了一片生机勃勃的变异野果灌木丛，紫红色的果实挂满枝头，在昏黄的日光下泛着诱人的光泽。几只变异雀鸟正在枝头啄食。",
    type: "welfare",
    weight: 40,
    choices: {
      A: {
        text: "就地采摘饱餐一顿 (饱食+12, 生命+5)",
        results: {
          stats: { food: 12, hp: 5 },
          logText: "你摘下最饱满的果实大快朵颐，酸甜的汁水在口中爆开。废土上能吃到新鲜野果简直是天堂般的享受，你的体力迅速恢复。"
        }
      },
      B: {
        text: "仔细挑选装袋带走 (获以太果肉x3, 获口粮x1)",
        results: {
          items: { aether_pulp: 3, ration: 1 },
          logText: "你耐心地挑选了最成熟的果实小心装袋，并用多余的果肉混合干粮压制了一包简易口粮。这些足够支撑好几天的探索了。"
        }
      }
    }
  },

  // --- 5. 古代遗迹 (Relic) 新增 ---
  abandoned_lab: {
    id: "abandoned_lab",
    title: "废弃魔导实验室",
    description: "半倒塌的实验室内，精密仪器和设备大多已损毁，但墙角一座密封的生物培养皿还在微微发出幽蓝色的磷光。培养皿上的标签写着『虚空植物样本·极度危险』，旁边散落着一堆工具。",
    type: "relic",
    weight: 50,
    choices: {
      A: {
        text: "小心破解培养皿加密锁 (魔能-12)",
        results: {
          stats: { energy: -12 },
          items: { seed_void_lotus: 1, void_essence: 1 },
          logText: "你屏住呼吸，小心翼翼地将魔能探入培养皿的加密锁芯。咔一声解锁，培养皿中静静躺着一颗虚空魔莲种子和一管提炼好的虚空精华！"
        }
      },
      B: {
        text: "搜刮实验室设备零件 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { nanite_injector: 1, alloy_plate: 1 },
          logText: "你在倒塌的仪器台间翻找，拆下了几块高纯度合金板和一支应急医疗舱备用的纳米修复注射针。虽然错过了植物样本，收获也不赖。"
        }
      }
    }
  },
  old_bunker: {
    id: "old_bunker",
    title: "古旧地下避难所",
    description: "你在一块翻转的混凝土板下发现了一段通向地下的阶梯。下方是一个保存相对完好的旧世避难所，铁门上刻着编号『B-7』，门缝里透出应急灯微弱的绿光。",
    type: "relic",
    weight: 50,
    choices: {
      A: {
        text: "探索避难所生活区 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { ration: 2, sanity_capsule: 1 },
          logText: "生活区里一片狼藉但物资尚存，你翻出了两包保存完好的压缩口粮，还在医药箱里找到了一瓶稳定精神状态的稳定胶囊。"
        }
      },
      B: {
        text: "检查避难所供电系统 (魔能-8)",
        results: {
          stats: { energy: -8 },
          items: { shield_battery: 1, plasma_cell: 1 },
          logText: "你打开了备用电源室，虽然主发电机早已熄火，但应急电源柜里还静静躺着一块重载护盾电池和一枚等离子电芯。"
        }
      }
    }
  },

  // --- 6. 异常天气 (Anomaly) 新增 ---
  sandstorm: {
    id: "sandstorm",
    title: "遮天蔽日沙尘暴",
    description: "天边涌现出一道接天连地的暗黄色沙墙，以摧枯拉朽之势朝你席卷而来。狂风裹挟着沙砾和碎石，能见度以肉眼可见的速度急剧下降。你必须立刻找地方躲避！",
    type: "anomaly",
    weight: 80,
    choices: {
      A: {
        text: "寻找岩洞躲避风暴 (饱食-10)",
        results: {
          stats: { food: -10 },
          items: { scrap_metal: 2 },
          logText: "你在风暴吞没前滚进了一处岩缝。外面风声如雷，你在洞里百无聊赖地翻出了前人遗留的两块废金属。"
        }
      },
      B: {
        text: "展开能量护盾继续赶路 (魔能-14)",
        results: {
          stats: { energy: -14 },
          items: { dream_shard: 1, mana_dust: 2 },
          logText: "你咬牙将护盾功率开到最大，在漫天黄沙中艰难前行。风暴中紊乱的魔能环境意外地在你周围凝结出了梦境碎片和魔能之尘！"
        }
      }
    }
  },
  magnetic_storm: {
    id: "magnetic_storm",
    title: "魔能地磁紊乱场",
    description: "踏入这片区域后，你发现指南针开始疯狂旋转，头发因静电根根竖起，空气中弥漫着嗡嗡的低频震动。地面上的金属碎片像是有了生命般在轻轻颤动。",
    type: "anomaly",
    weight: 80,
    choices: {
      A: {
        text: "忍受干扰强行穿越 (生命-5, 魔能-10)",
        results: {
          stats: { hp: -5, energy: -10 },
          items: { void_essence: 1, scrap_metal: 2 },
          logText: "你强忍着头晕恶心和肌肉刺痛穿过紊乱场，剧烈的魔能波动在你的防护服上凝结出了一些虚空精华。顺手吸了几块地上的废金属。"
        }
      },
      B: {
        text: "扎营等待磁场平息 (饱食-10, 理智+8)",
        results: {
          stats: { food: -10, sanity: 8 },
          logText: "你找了个相对安全的洼地扎营休息。几个小时后磁场逐渐平息，这段时间的静坐反而让你的思绪变得前所未有的清晰。"
        }
      }
    }
  },
  hail_storm: {
    id: "hail_storm",
    title: "冰雹风暴",
    description: "气温骤降，天空迅速被铅灰色的云层覆盖。豆大的冰雹开始砸落，迅速变得如拳头般大小，砸在地面上发出沉闷的巨响。你必须立刻寻找遮蔽物！",
    type: "anomaly",
    weight: 80,
    choices: {
      A: {
        text: "躲入废弃建筑物内等待 (饱食-8)",
        results: {
          stats: { food: -8 },
          items: { frost_crystal: 1, scrap_metal: 1 },
          logText: "你撞开一栋废弃民居的门躲了进去。冰雹砸在屋顶上轰鸣如鼓，你在冷冻室角落捡到一块自然凝结的冰晶结晶和一块废铁。"
        }
      },
      B: {
        text: "撑起能量护盾继续前进 (魔能-10)",
        results: {
          stats: { energy: -10 },
          items: { dream_shard: 1, alloy_plate: 1 },
          logText: "护盾在冰雹的冲击下荡起阵阵涟漪，每一次撞击都消耗着你的魔能。但在被砸翻的一个生锈邮箱里，你意外发现了一块梦境碎片和一块合金板。"
        }
      }
    }
  }
};

export const CATEGORY_WEIGHTS: Record<string, number> = {
  common: 100,
  danger: 80,
  combat: 60,
  welfare: 40,
  relic: 30,
  anomaly: 20
};
