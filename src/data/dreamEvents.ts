export type DreamEventType = 'welfare' | 'common' | 'danger' | 'signal';

export interface DreamChoice {
  text: string;
  results: {
    stats?: {
      sanity?: number;
      pollution?: number;
      resonance?: number; // 针对幸存者共鸣增加值
    };
    items?: Record<string, number>;
    logText: string;
    targetSurvivorId?: string; // 如果是特定幸存者共鸣
  };
}

export interface DreamEvent {
  id: string;
  title: string;
  description: string;
  type: DreamEventType;
  choices: {
    A: DreamChoice;
    B: DreamChoice;
  };
  weight?: number; // 出现权重，不填默认为 100
}

export const DREAM_EVENTS: Record<string, DreamEvent> = {
  memory_corridor: {
    id: "memory_corridor",
    title: "破碎记忆回廊",
    description: "在梦境深处，一排漂浮着彩色微光的门廊正在扭曲变形。透过门缝，你看到了灾变前熙熙攘攘的小镇景象。深入回溯可能让你重获灵感，但也会让废土的扭曲意识侵入大脑。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "深入回溯记忆 (理智-8, 污染+3)",
        results: {
          stats: { sanity: -8, pollution: 3 },
          items: { dream_shard: 2 },
          logText: "你沉浸在旧世界的宁静中，猛然惊醒后发现手中攥着两片暖洋洋的梦境碎片，但你的精神也沾染了些许黑色雾气。"
        }
      },
      B: {
        text: "匆匆走过走廊 (理智-3)",
        results: {
          stats: { sanity: -3 },
          logText: "你紧闭双眼跑过了记忆回廊。旧日的美好会成为废土上的毒药，你选择保持冷酷的清醒。"
        }
      }
    }
  },
  distorted_shadow: {
    id: "distorted_shadow",
    title: "游荡的梦魇残响",
    description: "一个由纯粹黑色烟雾组成的无面人挡住了你的去路。它在无声地尖叫，散发出刺骨的寒意。这是其他幸存者被吞噬的理智残留，正试图拉你一起沉沦。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "用意识强行驱散 (理智-10, 污染+6)",
        results: {
          stats: { sanity: -10, pollution: 6 },
          items: { dream_shard: 3 },
          logText: "你集中注意力爆发心灵电磁，强行冲散了黑影。碎裂 of 雾气凝结成3片梦境碎片，但你的意识大门也被梦魇强行撬宽了缝隙。"
        }
      },
      B: {
        text: "紧缩防线退避 (理智-5)",
        results: {
          stats: { sanity: -5 },
          logText: "你用双手抱头，封闭自己的心灵感知，从怪物身旁贴墙蹭过。虽然躲过了污染，但你的脑海仍像针扎一样疼。"
        }
      }
    }
  },
  roy_signal: {
    id: "roy_signal",
    title: "微弱的心灵震颤 (罗伊的信号)",
    description: "虚空中传来断断续续的求救波动。这是一个温热的心灵光点，名字似乎叫『罗伊』。如果全力与其对接，或许能反向追踪到他在现实废土中的肉体坐标！",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "建立心灵连结 (理智-8, 共鸣+50)",
        results: {
          stats: { sanity: -8, resonance: 50 },
          targetSurvivorId: "roy",
          logText: "你将理智丝线探入虚空。在一片嘈杂的心灵尖叫声中，你紧紧抓住了罗伊的信号，你们的意识产生了强烈共鸣！"
        }
      },
      B: {
        text: "忽略电波保持警惕 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "梦境中重重迷雾，你不敢冒险把意识伸向未知信号。波动在片刻后渐渐熄灭了。"
        }
      }
    }
  },
  mei_signal: {
    id: "mei_signal",
    title: "奇异的植物共振 (阿梅的信号)",
    description: "在梦境荧光森林的上空，飘浮着绿色的孢子光点，编织成女声微弱的叹息声。这代表着一个强大的植物共鸣天赋者『阿梅』。对接可能会耗费精力，但能获得她的坐标！",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "追踪植物声呐 (理智-8, 共鸣+50)",
        results: {
          stats: { sanity: -8, resonance: 50 },
          targetSurvivorId: "mei",
          logText: "你向绿光伸出了精神触角。脑海中瞬间浮现出巨大的藤蔓幻象和阿梅的呼唤，定位连接成功建立！"
        }
      },
      B: {
        text: "忽略绿光避开 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "你紧了紧兜帽，避开了那些漂浮的孢子，它们很快便在梦境深处消散了。"
        }
      }
    }
  },
  zero_signal: {
    id: "zero_signal",
    title: "急速移动的心灵光标 (Zero的信号)",
    description: "一个刺眼的亮蓝色心灵光标在你的梦境感知边缘高速掠过，闪烁着代表求救的莫尔斯电码。代号为『Zero』。如果不及时抓住，他可能会从链接网络中彻底掉线！",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "极速拦截建立连结 (理智-10, 共鸣+50)",
        results: {
          stats: { sanity: -10, resonance: 50 },
          targetSurvivorId: "zero",
          logText: "你瞬间燃烧理智向前飞跃，将精神捕获网稳稳套住了那个狂飙的光标。你捕获了 Zero 的方位信号！"
        }
      },
      B: {
        text: "放弃拦截原地待命 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "那个高速光标太不稳定了，拦截可能会导致精神力受损。你冷静地目送它坠入黑暗。"
        }
      }
    }
  },
  dream_abyss: {
    id: "dream_abyss",
    title: "意识虚空裂隙",
    description: "梦境的大地在你面前断裂，下方是万劫不复的斑斓深渊。隐约可以看到裂隙边缘附着着流动的紫水晶（梦境核心）。你可以冒着精神坠落的危险跨越它去采摘。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "强行跨越采摘 (理智-15, 污染+10)",
        results: {
          stats: { sanity: -15, pollution: 10 },
          items: { dream_shard: 4 },
          logText: "你深吸一口气纵身跃过裂缝，双手死死抠在对岸的紫水晶上。狂暴的心灵乱流冲击着你的认知，但你成功带回了4个高纯度碎片。"
        }
      },
      B: {
        text: "边缘绕行寻找回路 (理智-8)",
        results: {
          stats: { sanity: -8 },
          logText: "你选择绕路，在满是梦境迷雾的泥泞小道上走了很久。虽然浪费了大量精神力，但好在没有逆水行舟直面深渊的拉扯。"
        }
      }
    }
  },
  catherine_signal: {
    id: "catherine_signal",
    title: "消毒水味的波束 (凯瑟琳的信号)",
    description: "在梦境深处，你隐约闻到了一股散发着消毒水味的气息，以及微弱的手术刀碰撞声。这是前辐射防治所主任『凯瑟琳』发出的心灵波束，试图求救。",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "建立心灵连结 (理智-8, 共鸣+50)",
        results: {
          stats: { sanity: -8, resonance: 50 },
          targetSurvivorId: "catherine",
          logText: "你将理智丝线探入充满药水味的心灵雾气中，紧紧抓住了凯瑟琳的信号。在满布手术刀痕迹的梦境幻象中，你们成功建立了共鸣连接！"
        }
      },
      B: {
        text: "忽略信号波束 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "你觉得在危险的梦境中，带消毒水味的心灵波束可能是陷阱，你选择忽略它，让波束在黑暗中渐渐归于死寂。"
        }
      }
    }
  },
  buster_signal: {
    id: "buster_signal",
    title: "嘈杂的心灵重低音 (巴斯特的信号)",
    description: "在一阵极其嘈杂的心灵电波中，你听到了伴随金属电吉他嘶吼的粗犷歌声。电波中掺杂着粗野而刚毅的求救信号，似乎自称为『巴斯特』。",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "建立心灵连结 (理智-8, 共鸣+50)",
        results: {
          stats: { sanity: -8, resonance: 50 },
          targetSurvivorId: "buster",
          logText: "你用精神力网拦截下那段沙哑刺耳的重金属脑波。一阵轻微眩晕后，你与巴斯特达成了意识深处的共鸣！"
        }
      },
      B: {
        text: "忽略脑波噪声 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "这阵心灵波动过于狂暴刺耳，你担心它会彻底破坏你脆弱的思维防线，于是果断屏蔽了这段电波。"
        }
      }
    }
  },
  nova_signal: {
    id: "nova_signal",
    title: "警报与闪光信标 (诺娃的信号)",
    description: "在梦境的钢铁废墟上空，一道刺眼的橙色强光伴随着机甲过载警报声不断闪烁。这是前联合防卫军魔导机甲驾驶员『诺娃』紧急离舱前的战术信标。",
    type: "signal",
    weight: 100,
    choices: {
      A: {
        text: "追踪强光信标 (理智-10, 共鸣+50)",
        results: {
          stats: { sanity: -10, resonance: 50 },
          targetSurvivorId: "nova",
          logText: "你引导意识穿过闪烁的橙色警报光幕，强行在机甲动力过载核心彻底熔毁前截获了诺娃的精神信号，并确立了共鸣！"
        }
      },
      B: {
        text: "忽略警报信号 (理智-1)",
        results: {
          stats: { sanity: -1 },
          logText: "在梦境中被警报强光照射极易暴露位置，为了防范梦魇怪物的袭击，你谨慎地退出了这片钢铁废墟区域。"
        }
      }
    }
  },
  neon_ruins: {
    id: "neon_ruins",
    title: "梦境霓虹废墟",
    description: "眼前的荒原上突然耸立起一片被五彩霓虹灯扭曲包围的巨型摩天大楼废墟。空气中流动着电子废品般的色彩，充满着诡异而迷人的辐射波。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "驻足沉思感悟 (污染+8)",
        results: {
          stats: { pollution: 8 },
          items: { dream_shard: 2 },
          logText: "你站在霓虹灯光下闭上眼，静静感受着旧时代电子脉冲的余音。这让你的心灵防线沾染了些许彩色精神斑点，但也在手中凝结出两块梦境碎片。"
        }
      },
      B: {
        text: "摸黑穿过街区 (理智-8)",
        results: {
          stats: { sanity: -8 },
          items: { dream_shard: 1 },
          logText: "你不去理会那些迷幻的彩色灯光，低头闷声在废墟中快步穿过。虽然理智被冰冷的摩天大楼压抑得有些难受，但你安全地在角落拾取了一块梦境碎片。"
        }
      }
    }
  },
  childhood_carousel: {
    id: "childhood_carousel",
    title: "童年游乐园",
    description: "在一团乳白色的梦境柔光中，一架巨大的双层木马旋转秋千正播放着沙哑而断续的八音盒音乐。坐上去或许能寻回昔日遗落的纯真理智，但也可能被深层记忆永远吸附。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "坐上木马回忆 (理智+20, 污染+10)",
        results: {
          stats: { sanity: 20, pollution: 10 },
          logText: "你跨上了冰凉的木马，闭上眼，仿佛回到了阳光明媚、没有废土的童年时代。你的心灵得到了极大的宽慰和滋润，理智暴涨；然而，那些虚假幻影也深深侵蚀了你的心智。"
        }
      },
      B: {
        text: "绕行警惕危险 (理智-3)",
        results: {
          stats: { sanity: -3 },
          logText: "你明白在诡异的梦境中，一切美好皆是虚影，坐上去可能会让你彻底迷失。你痛苦地强迫自己转过头去，加快脚步离开了游乐园。"
        }
      }
    }
  },
  cloud_pillow: {
    id: "cloud_pillow",
    title: "梦境云朵枕头",
    description: "你面前漂浮着一块由糖果色雾气凝聚成的云朵枕头。它随着有节奏的心灵波长缓慢膨缩，并散发出淡淡的香草甜香，看起来非常温暖安逸。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "躺上松软的云朵 (理智+25, 污染-10)",
        results: {
          stats: { sanity: 25, pollution: -10 },
          logText: "你整个人陷进了散发着草莓香气的粉色云朵枕头里。暴躁的心灵低语迅速退去，你的理智瞬间大涨，心智污染也得到极大的净化！"
        }
      },
      B: {
        text: "用手收集云朵绒毛 (获得梦境碎片x2)",
        results: {
          items: { dream_shard: 2 },
          logText: "你捧起一抔柔软的云朵纤维塞入背包。这些绒毛在脱离云团后迅速凝结为两枚暖洋洋的梦境碎片。"
        }
      }
    }
  },
  ancient_wishing_well: {
    id: "ancient_wishing_well",
    title: "古老许愿泉",
    description: "在一棵巨大的莹光枯树下，静静横卧着一口石砌的古老许愿泉。泉水莹亮如镜，底部铺满了五颜六色、闪闪发光的金属币和意识结晶。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "投入一缕杂乱思绪 (理智-5, 获得梦境碎片x2)",
        results: {
          stats: { sanity: -5 },
          items: { dream_shard: 2 },
          logText: "你集中精力，将一段多余的杂乱回忆投入如镜的井水中。波纹荡漾间，两枚梦境碎片从井底缓缓浮出水面，被你轻巧拾起。"
        }
      },
      B: {
        text: "徒手打捞井底微光 (污染+8, 获得梦境碎片x3)",
        results: {
          stats: { pollution: 8 },
          items: { dream_shard: 3 },
          logText: "你将手臂探入冰冷刺骨的井水中打捞。虽然井水中的深渊寒意让你的心智污染值上升，但你捞到了三枚璀璨的梦境碎片。"
        }
      }
    }
  },
  mirror_of_truth: {
    id: "mirror_of_truth",
    title: "真理之镜",
    description: "一块边缘布满青苔的破碎水银镜悬浮在半空中。你走到它面前时，镜中折射出的身影竟然并非防化服，而是你心中最深处的自我本相。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "直视镜中的自己 (理智-5, 污染-15)",
        results: {
          stats: { sanity: -5, pollution: -15 },
          logText: "你驻足凝视着镜中那个疲惫却眼神坚毅的自我。这种冷静的直面击碎了脑海里梦境编织的幻影，心灵的重重污染得到了极大的疏导与净化。"
        }
      },
      B: {
        text: "打碎这面真理镜 (获得梦境碎片x2)",
        results: {
          items: { dream_shard: 2 },
          logText: "你一拳砸碎了镜子，防止虚妄的真实继续诱惑你。镜面随之碎裂散落，你从一地的亮片中捡起了其中最有价值的两块结晶碎片。"
        }
      }
    }
  },
  shadow_merchant: {
    id: "shadow_merchant",
    title: "梦境阴影行商",
    description: "一个身披黑色烟雾、手提虚空灯笼的瘦高兜帽人在雾气中拦住了你。他打开胸腔，露出里面散发着幽蓝冷光的意识碎片，示意可以用脑海中的清明理智进行交换。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "献祭理智交换碎片 (理智-15, 获得梦境碎片x4)",
        results: {
          stats: { sanity: -15 },
          items: { dream_shard: 4 },
          logText: "随着强烈的精神刺痛，大量的理智丝线被商人吸去。作为对等交换，他将四枚散发着冰冷荧光的精纯梦境碎片递到你的手中。"
        }
      },
      B: {
        text: "拒绝交易离开 (污染-5)",
        results: {
          stats: { pollution: -5 },
          logText: "你拒绝了怪物的交易，清醒的心智让梦境商人感到无趣。你感到原本缠绕脑海的污浊黑雾因你的克制而消散了一些。"
        }
      }
    }
  },
  lucid_garden: {
    id: "lucid_garden",
    title: "清明心智花园",
    description: "你穿过一片迷雾，突然进入了一个被发光蔷薇围绕的梦境温室花园。这里的空气极其清甜，四周甚至有隐隐约约的心灵唱诗声，让人感到灵魂被洗涤。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "嗅闻发光花朵的花香 (理智+15)",
        results: {
          stats: { sanity: 15 },
          logText: "你走上前，在一朵泛着温润绿光的花苞前深吸一口。一缕冰凉清爽的意念直冲大脑，你混沌的意识瞬间恢复了清亮。"
        }
      },
      B: {
        text: "修剪负面情绪枝丫 (污染-10)",
        results: {
          stats: { pollution: -10 },
          logText: "你静下心来，用精神念力幻化为剪刀，耐心地将灌木上代表怨念的黑色刺蔓全部修剪干净。专注的劳作排除了大量心智污染。"
        }
      }
    }
  },
  timeloop_classroom: {
    id: "timeloop_classroom",
    title: "时间循环教室",
    description: "推开一扇斑驳的木门，眼前是一个洒满橘红色夕阳的空旷教室。黑板上留着粉笔书写的方程式，微风吹动着白色窗帘，桌椅井然有序。这里似乎是你在灾变前的学校回忆。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "坐在课桌前听课 (理智+20, 污染+5)",
        results: {
          stats: { sanity: 20, pollution: 5 },
          logText: "你坐在熟悉的课桌前，听着讲台上传来的沙沙黑板书写声。昔日求学的宁静日常极大地治愈了你废土上的饱经沧桑，但同时也令你的心智有些沉沦。"
        }
      },
      B: {
        text: "黑板写下解构密码 (获得稳定胶囊x1)",
        results: {
          items: { sanity_capsule: 1 },
          logText: "你用粉笔在黑板上画出解构梦境的几何图。教室幻境如同玻璃般破裂退去，在桌面上留下了一枚用于现实稳定的理智稳定胶囊。"
        }
      }
    }
  },
  glass_labyrinth: {
    id: "glass_labyrinth",
    title: "镜面反光迷宫",
    description: "四周全部由高耸入云的镜面玻璃墙构成，形成了一个无边无际的折射迷宫。千万个你在镜子里以诡异的姿态转过头来注视着你，让你感到心跳加速、思维受挫。",
    type: "danger",
    weight: 80,
    choices: {
      A: {
        text: "冷静解析摸索出口 (理智-12, 获得梦境碎片x3)",
        results: {
          stats: { sanity: -12 },
          items: { dream_shard: 3 },
          logText: "你强忍眼花缭乱的镜像干扰，在无数块镜面上触摸排查。在消耗了极大的精力和理智后，你终于寻得出口，并带回了三枚镜子底座的梦碎片。"
        }
      },
      B: {
        text: "闭眼凭直觉穿梭 (污染+12, 获得梦境碎片x4)",
        results: {
          stats: { pollution: 12 },
          items: { dream_shard: 4 },
          logText: "你干脆闭上双眼，任凭梦境深处最原始的直觉支配身躯。当你再次睁眼时，你已经奇迹般穿过了迷宫，手里攥着四块碎片，但脑中也多了一些混沌的声音。"
        }
      }
    }
  },
  floating_island: {
    id: "floating_island",
    title: "悬浮心之岛",
    description: "一块巨大的草坪悬浮在虚空之中，几条彩虹状的彩光桥连接着岛屿。岛屿中央有一颗扭曲的心灵古树，在树干的空洞里正吞吐着异样耀眼的精神波动。",
    type: "common",
    weight: 100,
    choices: {
      A: {
        text: "搜寻古树树洞 (理智-8, 获得梦境碎片x2)",
        results: {
          stats: { sanity: -8 },
          items: { dream_shard: 2 },
          logText: "你快步跑过浮桥，顶着失重感在古树中掏摸。翻出了几本被遗忘的心灵日记残本，它们被你的脑电波解构为两块精纯碎片。"
        }
      },
      B: {
        text: "收集粗藤上的果实 (理智-3, 获得虚空精华x1)",
        results: {
          stats: { sanity: -3 },
          items: { void_essence: 1 },
          logText: "你没有去树洞冒险，而是小心顺着藤蔓攀爬，采摘下了一颗在梦境狂澜中成熟的紫色『虚空精华』果实。"
        }
      }
    }
  },
  storm_of_ideas: {
    id: "storm_of_ideas",
    title: "思维灵感风暴",
    description: "突如其来的强烈脑电波风暴席卷了梦境荒野，无数发光的公式、战前影像和尖叫声汇聚成一道通天彻地的金色龙卷风。正从你的头顶呼啸而过！",
    type: "danger",
    weight: 85,
    choices: {
      A: {
        text: "置身风暴核心记录 (理智-15, 污染+12, 获得梦境碎片x5)",
        results: {
          stats: { sanity: -15, pollution: 12 },
          items: { dream_shard: 5 },
          logText: "你咬紧牙关，将身躯置于狂暴的思想洪流核心。无数记忆流强行灌注进你的大脑，虽然让你头痛欲裂、污染飙升，但也强行凝结了五枚厚重的碎片！"
        }
      },
      B: {
        text: "筑起心灵思维防线 (理智-5, 污染-5)",
        results: {
          stats: { sanity: -5, pollution: -5 },
          logText: "你立刻席地打坐，用纯粹的理性防壁隔绝外界的嘈杂思维。狂澜呼啸而过，你的理智虽有损耗，但在这场心智防卫战中，你内心的杂念反被洗涤干净。"
        }
      }
    }
  },
  forgotten_lullaby: {
    id: "forgotten_lullaby",
    title: "被遗忘的八音盒旋律",
    description: "在一片被深红大雾笼罩的梦境遗迹中，一个闪着金光的老旧音乐盒正在废墟上缓缓旋转，叮叮咚咚地播放着一首轻柔、舒缓的睡前安眠曲。",
    type: "welfare",
    weight: 100,
    choices: {
      A: {
        text: "在废墟旁静静聆听 (理智+18)",
        results: {
          stats: { sanity: 18 },
          logText: "你安静地坐在音乐盒旁。轻柔舒缓的旋律流入双耳，驱散了你连日在废土生存中积攒的负面心智，理智得到了极佳的恢复。"
        }
      },
      B: {
        text: "上前为八音盒发条 (理智+5, 污染-10)",
        results: {
          stats: { sanity: 5, pollution: -10 },
          logText: "你走上前，轻轻将八音盒的发条拧紧。更加清脆透亮的音符飘散开来，震碎了废墟周围弥漫的黑色心智污染雾气。"
        }
      }
    }
  }
};
