export type RealityEventType = 'welfare' | 'common' | 'danger' | 'combat';

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
  radiation_leak: {
    id: "radiation_leak",
    title: "高浓度魔能辐射带",
    description: "前方的谷地中飘浮着幽绿的雾气，这是灾变时魔能管道碎裂残留的高能辐射气团。直接穿过去可能会受重伤，但这是通往废墟深处的捷径。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "激发魔能过滤盾 (魔能-10)",
        results: {
          stats: { energy: -10 },
          items: { dream_shard: 1, scrap_metal: 2 },
          logText: "你启动防护服的过滤结界。随着魔能消耗，你成功穿过了绿雾，顺手在废墟残骸中撬下几块金属板，并捡到了一枚亮晶晶的梦境碎片。"
        }
      },
      B: {
        text: "花时间绕道而行 (饱食-10, 生命-3)",
        results: {
          stats: { food: -10, hp: -3 },
          logText: "你选择翻山绕过这片毒雾。漫长的跋涉消耗了体力，寒冷的地表风沙也让你的生命值受到些许损伤。"
        }
      }
    }
  },
  mutant_beast: {
    id: "mutant_beast",
    title: "荒野变异犬",
    description: "一只皮毛脱落、双眼赤红的变异野狗突然从断墙后窜了出来，呲着钢针般的獠牙对你低吼。它看起来极度饥饿，正准备把你当成美餐。",
    type: "combat",
    weight: 100,
    choices: {
      A: {
        text: "用魔能震荡击退 (生命-10, 魔能-8)",
        results: {
          stats: { hp: -10, energy: -8 },
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
  toxic_swamp: {
    id: "toxic_swamp",
    title: "酸雨腐蚀沼泽",
    description: "前方是一片被酸雨长年累月腐蚀的毒素沼泽，泥浆中泛着刺鼻的黄绿色气泡。强行蹚过可能会受伤，但能节省时间并可能发现遗留在底部的奇异植物种子；绕行则需要消耗大量体力。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "强行蹚过沼泽 (生命-10)",
        results: {
          stats: { hp: -10 },
          items: { seed_plasma_pumpkin: 1, alloy_plate: 1 },
          logText: "你咬紧牙关从小腿深的腐蚀泥浆中穿过，防护服被酸液灼烧得咝咝作响。但你在沼泽中心的废墟里捞到了一个密封盒，里面有一颗等离子南瓜种子和一块合金金属板。"
        }
      },
      B: {
        text: "安全绕行毒沼 (饱食-10)",
        results: {
          stats: { food: -10 },
          logText: "你选择花费更多时间从沼泽边缘的坚硬岩石区绕过去。这增加了体能消耗，你的饱食度下降，但好在没有受伤。"
        }
      }
    }
  },
  wandering_trader: {
    id: "wandering_trader",
    title: "黑市流浪商人",
    description: "一名身穿破旧防化斗篷、背着巨大金属箱的流浪商人在废墟阴影中向你招手。他声称自己手里有一些珍稀的温室变异植物种子，只接受废旧金属作为交换。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "用废铁交换珍稀种子 (消耗废旧金属x3)",
        requirements: { scrap_metal: 3 },
        results: {
          items: { scrap_metal: -3, seed_magma_pepper: 1, seed_frost_bell: 1 },
          logText: "你拿出3个废旧金属零件递给商人。商人露出了满意的笑容，从怀里摸出一颗熔岩椒种子和一颗霜冻风铃草种子作为回报。"
        }
      },
      B: {
        text: "拒绝交易离开 (饱食-1)",
        results: {
          stats: { food: -1 },
          logText: "你警惕地拒绝了他的交易，并迅速离开。由于绕路防范商人的跟踪，你消耗了少许饱食度。"
        }
      }
    }
  },
  military_caches: {
    id: "military_caches",
    title: "报废的自动机炮",
    description: "在废弃的哨所旁，一尊古老的自动防卫机炮歪倒在地上。它的识别模块已彻底损毁，但其弹药箱和电池仓似乎还保存完好，你可以尝试用魔能熔毁锁扣，或者直接暴力拆卸。",
    type: "danger",
    weight: 85,
    choices: {
      A: {
        text: "暴力拆卸电池仓 (生命-6, 饱食-6)",
        results: {
          stats: { hp: -6, food: -6 },
          items: { plasma_cell: 1, scrap_metal: 2 },
          logText: "你用工坊撬棍对准电池仓的缝隙砸了下去。随着一阵耀眼的电火花，你被轻微电击并消耗了体力，但也成功拿到了一个等离子电芯和两块废旧金属。"
        }
      },
      B: {
        text: "魔能溶解安全锁 (魔能-10)",
        results: {
          stats: { energy: -10 },
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
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "激活魔能护盾探索 (魔能-12)",
        results: {
          stats: { energy: -12 },
          items: { frost_crystal: 2, dream_shard: 1 },
          logText: "你利用魔能护盾包裹全身，隔绝了重力扭曲对身体的挤压。你穿梭于悬浮的废墟间，顺利采掘到两枚冰晶结晶以及一块散落的梦境碎片。"
        }
      },
      B: {
        text: "徒手爬过异常区 (生命-8, 饱食-8)",
        results: {
          stats: { hp: -8, food: -8 },
          items: { frost_crystal: 1, scrap_metal: 2 },
          logText: "你在失重与超重交替的碎石之间攀爬前进，受了点轻伤。最终，你勉强捡到了一枚冰晶结晶和一些废旧金属。"
        }
      }
    }
  },
  broken_greenhouse: {
    id: "broken_greenhouse",
    title: "废弃魔导水培室",
    description: "一间在大灾变中半毁的水培温室静静矗立在路旁。这里的自动培育架早已停转，但某些防爆培育槽可能还有未孵化的种子，供电板上也有些残留零件。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "搜寻水培控制台 (饱食-6)",
        results: {
          stats: { food: -6 },
          items: { seed_void_lotus: 1, seed_glow_grass: 1 },
          logText: "你仔细搜寻培育台下方的种子冷藏箱。在消耗了些许体力后，你成功取出了一个保存状态良好的虚空魔莲种子和一颗普通的荧光草种子。"
        }
      },
      B: {
        text: "拆卸紧急供电板 (生命-3, 魔能-6)",
        results: {
          stats: { hp: -3, energy: -6 },
          items: { alloy_plate: 2 },
          logText: "你引导微量魔力逆向给供电板放电并进行拆卸。你成功拆下了两块厚实的合金金属板。"
        }
      }
    }
  },
  acid_rain_storm: {
    id: "acid_rain_storm",
    title: "突发魔能酸雨",
    description: "天空突然变成了诡异的暗紫色，带电的雨滴开始淅淅沥沥地砸落，并在地表腐蚀出刺鼻的白烟。这是致命的魔能酸雨风暴，你需要立刻决定对策。",
    type: "danger",
    weight: 90,
    choices: {
      A: {
        text: "就近找废墟躲避 (饱食-8)",
        results: {
          stats: { food: -8 },
          items: { scrap_metal: 2 },
          logText: "你躲进一栋破损的水泥大楼中。在等待酸雨停息的这段时间里，你的饱食度不断流逝。闲着无聊，你在楼内杂物堆里顺手翻出了两件废铁。"
        }
      },
      B: {
        text: "超频护盾硬顶雨前进 (魔能-12)",
        results: {
          stats: { energy: -12 },
          items: { dream_shard: 1 },
          logText: "你将魔能注入防护衣，让魔能护盾在头顶形成一道防御光幕。你虽然消耗了魔能，但在被雨水冲刷的地表凹槽中发现了一枚晶莹的梦境碎片。"
        }
      }
    }
  },
  cozy_hotspring: {
    id: "cozy_hotspring",
    title: "地底温热泉水",
    description: "在幽暗 of 地下溶洞中，有一汪清澈见底的温热泉水，正腾腾地冒着白气。水波温和地拍打着岩壁，这在废土的恶劣环境下简直是一个不可思议的安详港湾。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "浸泡温泉放松 (生命+15, 饱食+5)",
        results: {
          stats: { hp: 15, food: 5 },
          logText: "你脱下厚重的防化手套，在温暖舒适的泉水里泡了一会儿。连日来的疲惫一扫而空，甚至感觉身体力量有些微恢复。"
        }
      },
      B: {
        text: "灌装泉水带走 (获得能量补充剂x1)",
        results: {
          items: { energy_refill: 1 },
          logText: "你掏出随身空随身瓶，灌装了一满瓶充满高能矿物质和微量魔导活性的泉水，完美制成了一剂魔能能量补充剂。"
        }
      }
    }
  },
  abandoned_camp: {
    id: "abandoned_camp",
    title: "废弃避难所营地",
    description: "你发现了一处被废弃不久的地面临时营地，周围搭着厚实的防风帆布。四周静悄悄的，避难所主人似乎走得很匆忙，大部分日常家具还留在原处。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "仔细搜刮储藏箱 (获得压缩口粮x2, 废金属x2)",
        results: {
          items: { ration: 2, scrap_metal: 2 },
          logText: "你小心翼翼地推开防风门。在一口密封完好的木箱里，你翻到了两袋高能量旧世压缩口粮和两件沉甸甸的废金属零件！"
        }
      },
      B: {
        text: "在简易床上小憩 (生命+10, 理智+10)",
        results: {
          stats: { hp: 10, sanity: 10 },
          logText: "你关紧木门，躺在虽然落满灰尘但足够舒适的床垫上打了个盹。在安稳的环境下，你的身体和精神都得到了极大的休息。"
        }
      }
    }
  },
  glowing_crystal_cave: {
    id: "glowing_crystal_cave",
    title: "莹光水晶洞穴",
    description: "顺着一条狭窄的岩缝爬下，你进入了一个巨大的地底空腔。四周闪烁着深蓝色的寒冰辐射晶簇，晶莹剔透，散发着刺骨的凉意。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "使用工具凿击晶体 (饱食-8, 获得冰晶结晶x2)",
        results: {
          stats: { food: -8 },
          items: { frost_crystal: 2 },
          logText: "你拿起随身工兵铲，费劲地从岩壁上凿下两颗闪烁着冷光的冰晶结晶。这消耗了你的些许饱食度。"
        }
      },
      B: {
        text: "魔能共鸣充能 (魔能-10, 获得冰晶结晶x3)",
        results: {
          stats: { energy: -10 },
          items: { frost_crystal: 3 },
          logText: "你将魔能注入水晶簇。强烈的温差共振让三枚冰晶自行脱落，但也汲取了你不少魔能能量。"
        }
      }
    }
  },
  aether_energy_well: {
    id: "aether_energy_well",
    title: "以太能量喷泉",
    description: "地表的一口能量裂缝正向外徐徐喷吐着淡紫色的以太能量液雾，微弱的波纹让周围的废墟磁场都变得柔和起来。这里充满着精纯的以太游离能量。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "直接吸收喷泉能量 (魔能+25, 生命+5)",
        results: {
          stats: { energy: 25, hp: 5 },
          logText: "你张开双手迎接喷薄而出的以太液雾，充沛的以太能量穿过防化服的采集栅格被你吸收，你的精神和体力得到极大的补充。"
        }
      },
      B: {
        text: "收集晶化残渣 (获得以太浆果种子x2)",
        results: {
          items: { seed_aether_berry: 2 },
          logText: "你小心地在喷泉口边缘刮下一层因能量冷凝结成的结晶残渣，从中剥离出了两颗亮晶晶的以太浆果种子。"
        }
      }
    }
  },
  mysterious_capsule: {
    id: "mysterious_capsule",
    title: "神秘冷冻休眠舱",
    description: "一具厚重的科幻金属舱体半掩在流沙中，指示灯还在规律地一闪一灭。虽然舱里的冷冻对象早已在大灾变中断电离世，但其紧急医疗储备和电池似乎还处于密闭状态。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "暴力破拆电子舱门 (饱食-10, 获得纳米修复针x1)",
        results: {
          stats: { food: -10 },
          items: { nanite_injector: 1 },
          logText: "你用手头的撬棍狠狠砸向休眠舱的紧急阀门。在刺耳的气压释放声中，你从暗格里找到了一支处于真空包装下的纳米修复针！"
        }
      },
      B: {
        text: "接入避难所电池接口 (魔能-10, 获得重载护盾电池x1)",
        results: {
          stats: { energy: -10 },
          items: { shield_battery: 1 },
          logText: "你使用防护服的接口为休眠舱提供了一次短路脉冲供电。舱盖缓缓打开，你从备用电容中拆卸出了一节完好的重载护盾电池。"
        }
      }
    }
  },
  collapsed_supermarket: {
    id: "collapsed_supermarket",
    title: "坍塌的旧世商超",
    description: "一块半挂在空中的招牌下，是一间在战火中坍塌了大半的旧时代超级市场。大部分柜台已经被泥沙掩埋，但在隐蔽的角落或许还残留着一些密封较好的保鲜罐。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "撬开食品防潮柜 (饱食-5, 获得压缩口粮x2)",
        results: {
          stats: { food: -5 },
          items: { ration: 2 },
          logText: "你在废墟的瓦砾堆下撬开了一个扁平的金属防潮食品柜，惊喜地发现两包保存极其完好的旧世压缩口粮！"
        }
      },
      B: {
        text: "搜索生鲜种子专区 (饱食-5, 获得等离子南瓜种子x1, 荧光草种子x1)",
        results: {
          stats: { food: -5 },
          items: { seed_plasma_pumpkin: 1, seed_glow_grass: 1 },
          logText: "你来到已被泥土半掩的种子冷柜，经过仔细甄别，找到了一颗等离子南瓜种子和一颗普通的荧光草种子。"
        }
      }
    }
  },
  scrap_graveyard: {
    id: "scrap_graveyard",
    title: "机甲废铁终结地",
    description: "这里是一处战时机甲的回收掩埋坑，堆积如山的机械假肢、断裂的合金履带和锈蚀的管线铺满了方圆百米，空气中弥漫着刺鼻的润滑油和废铁气味。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "用背囊装运零件 (饱食-8, 获得废旧金属x4)",
        results: {
          stats: { food: -8 },
          items: { scrap_metal: 4 },
          logText: "这片区域随随处可见有价值的金属零碎。你挑挑拣拣，搬运了满满一袋废旧金属回去，但体力消耗也使你感到肚子饿得咕咕叫。"
        }
      },
      B: {
        text: "拆卸高级机甲胸甲 (魔能-6, 获得废旧金属x2, 合金金属板x1)",
        results: {
          stats: { energy: -6 },
          items: { scrap_metal: 2, alloy_plate: 1 },
          logText: "你用微弱的魔能高热切割枪精准切下了几枚关节，收获了2个废旧零件和一块厚实的多层合金板。"
        }
      }
    }
  },
  wild_dandelion_field: {
    id: "wild_dandelion_field",
    title: "野生蒲公英花田",
    description: "在一堵巨大的钢筋混凝土防爆墙后，竟然奇迹般地绽放着一片未受辐射污染的野生蒲公英花田。洁白蓬松的毛绒在微风中飞舞，散发着草木本真的清香。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "编织蒲公英花环 (理智+15)",
        results: {
          stats: { sanity: 15 },
          logText: "你坐在花田旁，轻轻编织了一个花环放在了防化服的头盔上。在大自然的抚慰下，你脑海中长期紧绷的神经放松了许多。"
        }
      },
      B: {
        text: "采摘根茎咀嚼 (生命+10, 饱食-2)",
        results: {
          stats: { hp: 10, food: -2 },
          logText: "你采下一些蒲公英嫩根生吃。虽然味道苦涩，但纯净的自然草药给你的机体提供了强大的抗毒支撑，生命值有所恢复。"
        }
      }
    }
  },
  ancient_library: {
    id: "ancient_library",
    title: "大图书馆遗迹",
    description: "你穿过一扇破损的石拱门，走入了一间早已半塌的古代图书馆。虽然大部分书架和书籍都已经腐烂成灰，但在密闭的金属阅读隔间里，仍有少许未风化的藏书。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "翻阅诗歌残本 (理智+12, 获得梦境碎片x1)",
        results: {
          stats: { sanity: 12 },
          items: { dream_shard: 1 },
          logText: "你轻轻翻开一本落满尘土的书卷。里面精美的诗句安抚了你紧绷的理智，并在你的精神深处凝结成了一块晶莹的梦境碎片。"
        }
      },
      B: {
        text: "拆解航空合金阅读架 (饱食-5, 获得合金金属板x2)",
        results: {
          stats: { food: -5 },
          items: { alloy_plate: 2 },
          logText: "这里的书架是用极其名贵的轻质抗辐射合金制成的。你熟练地用工具卸下了两块完好无损的合金金属板。"
        }
      }
    }
  },
  dangerous_precipice: {
    id: "dangerous_precipice",
    title: "危险的金属悬崖",
    description: "一块断裂的高架桥轨道斜斜地斜插在岩壁上，形成了一道直插云霄的金属悬崖。在最顶端的控制室废墟中，隐约有红色的警告灯闪烁，似乎残留着极为罕见的科技遗产。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "冒风沙强行攀登 (生命-12, 获得虚空魔莲种子x1, 梦境碎片x1)",
        results: {
          stats: { hp: -12 },
          items: { seed_void_lotus: 1, dream_shard: 1 },
          logText: "刺骨的地表风沙吹得你几乎无法睁开双眼，攀爬中外骨骼也受到了摩擦损坏。不过，你成功在崖顶的废墟保险抽屉中拿到了一颗虚空魔莲种子和一枚梦境碎片！"
        }
      },
      B: {
        text: "在崖底翻找落物 (饱食-6, 获得废旧金属x2)",
        results: {
          stats: { food: -6 },
          items: { scrap_metal: 2 },
          logText: "考虑到风险，你只在悬崖下方的瓦砾掩埋处仔细寻找，虽然没有拿到珍稀物品，但翻找出了两个能用的金属螺母和废铁零件。"
        }
      }
    }
  }
};
