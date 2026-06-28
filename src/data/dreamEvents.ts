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
  choices: {
    A: DreamChoice;
    B: DreamChoice;
  };
}

export const DREAM_EVENTS: Record<string, DreamEvent> = {
  memory_corridor: {
    id: "memory_corridor",
    title: "破碎记忆回廊",
    description: "在梦境深处，一排漂浮着彩色微光的门廊正在扭曲变形。透过门缝，你看到了灾变前熙熙攘攘的小镇景象。深入回溯可能让你重获灵感，但也会让废土的扭曲意识侵入大脑。",
    choices: {
      A: {
        text: "深入回溯记忆 (理智-10, 污染+5)",
        results: {
          stats: { sanity: -10, pollution: 5 },
          items: { dream_shard: 2 },
          logText: "你沉浸在旧世界的宁静中，猛然惊醒后发现手中攥着两片暖洋洋的梦境碎片，但你的精神也沾染了些许黑色雾气。"
        }
      },
      B: {
        text: "匆匆走过走廊 (理智-5)",
        results: {
          stats: { sanity: -5 },
          logText: "你紧闭双眼跑过了记忆回廊。旧日的美好会成为废土上的毒药，你选择保持冷酷的清醒。"
        }
      }
    }
  },
  distorted_shadow: {
    id: "distorted_shadow",
    title: "游荡的梦魇残响",
    description: "一个由纯粹黑色烟雾组成的无面人挡住了你的去路。它在无声地尖叫，散发出刺骨的寒意。这是其他幸存者被吞噬的理智残留，正试图拉你一起沉沦。",
    choices: {
      A: {
        text: "用意识强行驱散 (理智-15, 污染+10)",
        results: {
          stats: { sanity: -15, pollution: 10 },
          items: { dream_shard: 3 },
          logText: "你集中注意力爆发心灵电磁，强行冲散了黑影。碎裂的雾气凝结成3片梦境碎片，但你的意识大门也被梦魇强行撬宽了缝隙。"
        }
      },
      B: {
        text: "紧缩防线退避 (理智-8)",
        results: {
          stats: { sanity: -8 },
          logText: "你用双手抱头，封闭自己的心灵感知，从怪物身旁贴墙蹭过。虽然躲过了污染，但你的脑海仍像针扎一样疼。"
        }
      }
    }
  },
  roy_signal: {
    id: "roy_signal",
    title: "微弱的心灵震颤 (罗伊的信号)",
    description: "虚空中传来断断续续的求救波动。这是一个温热的心灵光点，名字似乎叫『罗伊』。如果全力与其对接，或许能反向追踪到他在现实废土中的肉体坐标！",
    choices: {
      A: {
        text: "建立心灵连结 (理智-10, 共鸣+50)",
        results: {
          stats: { sanity: -10, resonance: 50 },
          targetSurvivorId: "roy",
          logText: "你将理智丝线探入虚空。在一片嘈杂的心灵尖叫声中，你紧紧抓住了罗伊的信号，你们的意识产生了强烈共鸣！"
        }
      },
      B: {
        text: "忽略电波，保持警惕 (理智-2)",
        results: {
          stats: { sanity: -2 },
          logText: "梦境中重重迷雾，你不敢冒险把意识伸向未知信号。波动在片刻后渐渐熄灭了。"
        }
      }
    }
  },
  mei_signal: {
    id: "mei_signal",
    title: "奇异的植物共振 (阿梅的信号)",
    description: "在梦境荧光森林的上空，飘浮着绿色的孢子光点，编织成女声微弱的叹息声。这代表着一个强大的植物共鸣天赋者『阿梅』。对接可能会耗费精力，但能获得她的坐标！",
    choices: {
      A: {
        text: "追踪植物声呐 (理智-10, 共鸣+50)",
        results: {
          stats: { sanity: -10, resonance: 50 },
          targetSurvivorId: "mei",
          logText: "你向绿光伸出了精神触角。脑海中瞬间浮现出巨大的藤蔓幻象和阿梅的呼唤，定位连接成功建立！"
        }
      },
      B: {
        text: "忽略绿光避开 (理智-2)",
        results: {
          stats: { sanity: -2 },
          logText: "你紧了紧兜帽，避开了那些漂浮的孢子，它们很快便在梦境深处消散了。"
        }
      }
    }
  },
  zero_signal: {
    id: "zero_signal",
    title: "急速移动的心灵光标 (Zero的信号)",
    description: "一个刺眼的亮蓝色心灵光标在你的梦境感知边缘高速掠过，闪烁着代表求救的莫尔斯电码。代号为『Zero』。如果不及时抓住，他可能会从链接网络中彻底掉线！",
    choices: {
      A: {
        text: "极速拦截建立连结 (理智-12, 共鸣+50)",
        results: {
          stats: { sanity: -12, resonance: 50 },
          targetSurvivorId: "zero",
          logText: "你瞬间燃烧理智向前飞跃，将精神捕获网稳稳套住了那个狂飙的光标。你捕获了 Zero 的方位信号！"
        }
      },
      B: {
        text: "放弃拦截，原地待命 (理智-2)",
        results: {
          stats: { sanity: -2 },
          logText: "那个高速光标太不稳定了，拦截可能会导致精神力受损。你冷静地目送它划过夜空坠入黑暗。"
        }
      }
    }
  },
  dream_abyss: {
    id: "dream_abyss",
    title: "意识虚空裂隙",
    description: "梦境的大地在你面前断裂，下方是万劫不复的斑斓深渊。隐约可以看到裂隙边缘附着着流动的紫水晶（梦境核心）。你可以冒着精神坠落的危险跨越它去采摘。",
    choices: {
      A: {
        text: "强行跨越采摘 (理智-20, 污染+15)",
        results: {
          stats: { sanity: -20, pollution: 15 },
          items: { dream_shard: 4 },
          logText: "你深吸一口气纵身跃过裂缝，双手死死抠在对岸的紫水晶上。狂暴的心灵乱流几乎吹散了你的自我认知，但你成功带回了4个高纯度碎片。"
        }
      },
      B: {
        text: "边缘绕行寻找回路 (理智-10)",
        results: {
          stats: { sanity: -10 },
          logText: "你选择绕路，在满是梦境迷雾的泥泞小道上走了很久。虽然浪费了大量精神力，但好在没有直面深渊的拉扯。"
        }
      }
    }
  }
};
