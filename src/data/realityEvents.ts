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
  }
};
