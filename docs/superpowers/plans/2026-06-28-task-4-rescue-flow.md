# 救援剧情与同伴加成接入 WildernessTab.tsx 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改 `src/components/WildernessTab.tsx`，定义新增的 3 种救援卡牌并接入救援第 5 步分支，同时实现在地表探索动作及遭遇结算时接入凯瑟琳的消耗降低被动、巴斯特的废铁加成。

**Architecture:** 
1. 在 `WildernessTab.tsx` 中导入或定义新营救卡牌。
2. 扩展 `drawEvent` 和地图列表，正确匹配凯瑟琳、巴斯特和诺娃的救援地点。
3. 修改 `handleStartExploration` 进行前置消耗判断与扣减时，根据 `state.survivors.zero`（魔能 -15%，且若已解救则饱食度 -15%）与 `state.survivors.catherine`（若已解救则饱食度 -15%）的被动折算。
4. 修改 `handleMakeChoice` 处理属性扣减与物品获取时，应用凯瑟琳的负面属性减耗（HP/Food 扣减 -15%）与巴斯特的废铁产出加成（废金属获取 +30%）。

**Tech Stack:** React, TypeScript, TailwindCSS

## Global Constraints

- 保证 `npx tsc --noEmit` 编译通过。
- 逻辑中的各项加成乘算后，使用 `Math.round` 进行四舍五入。
- 极值与边界处理：保障属性（hp, food, energy）在计算和对比时，不会低于或超出边界（不为负数，提示语中扣减上限精确匹配）。

---

### Task 1: 定义新营救事件卡牌

**Files:**
- Modify: `src/components/WildernessTab.tsx:10-82`

**Interfaces:**
- Produces: `CATHERINE_RESCUE_EVENT`, `BUSTER_RESCUE_EVENT`, `NOVA_RESCUE_EVENT` (类型的 `RealityEvent`)

- [ ] **Step 1: 在 `ZERO_RESCUE_EVENT` 之后追加新定义的 3 张救援卡牌**

在 `WildernessTab.tsx` 中 `ZERO_RESCUE_EVENT` 定义之后追加以下内容：

```typescript
const CATHERINE_RESCUE_EVENT: RealityEvent = {
  id: "rescue_catherine",
  title: "生化实验室：营迎凯瑟琳",
  description: "实验室里弥漫着毒气，凯瑟琳医生被一群魔化辐射老鼠包围在配药舱内。你可以使用纳米修复针强攻，或者用魔能超频强熔溶解锁。",
  choices: {
    A: {
      text: "使用纳米修复针破除大门 (需纳米针x1, 生命-10)",
      requirements: { nanite_injector: 1 },
      results: {
        stats: { hp: -10 },
        items: { nanite_injector: -1 },
        logText: "你快速使用纳米修复针打破封锁并保护凯瑟琳，虽然防化服被毒气微量腐蚀，但成功救出！"
      }
    },
    B: {
      text: "魔能超频强熔溶解锁 (生命-20, 魔能-35)",
      results: {
        stats: { hp: -20, energy: -35 },
        logText: "你强开魔能高热熔断锁孔，在变异鼠群合围前破门而入，成功救出凯瑟琳！"
      }
    }
  }
};

const BUSTER_RESCUE_EVENT: RealityEvent = {
  id: "rescue_buster",
  title: "坍塌地铁站：营救巴斯特",
  description: "地铁站月台半塌陷，巴斯特的腿被碎石死死压住，而黑暗的隧道深处传来变异掘墓兽的沉重咆哮声。你需要部署防御炮塔，或者强行肉搏拉人。",
  choices: {
    A: {
      text: "部署防御炮塔压制怪物 (需防御炮塔x1)",
      requirements: { defensive_turret: 1 },
      results: {
        items: { defensive_turret: -1 },
        logText: "你迅速部署炮塔建立防线。强烈的电磁火花在隧道中爆发，你趁机用铁锹撬开碎石，救出巴斯特！"
      }
    },
    B: {
      text: "肉搏变异体强行拉人 (生命-35, 魔能-15)",
      results: {
        stats: { hp: -35, energy: -15 },
        logText: "你丢开武器徒手推开巨石。狂暴的怪兽撕咬伤了你的侧腹，但你强忍重伤背起巴斯特脱离了地铁站！"
      }
    }
  }
};

const NOVA_RESCUE_EVENT: RealityEvent = {
  id: "rescue_nova",
  title: "军火库：营救诺娃",
  description: "诺娃被困在受辐射的报废魔导机甲驾驶舱内，机甲核心已经处于临界过载的边缘，极度危险！你需要使用重载护盾电池稳定磁场，或者超频暴力破拆机甲。",
  choices: {
    A: {
      text: "使用重载护盾电池稳定磁场 (需护盾电池x1)",
      requirements: { shield_battery: 1 },
      results: {
        items: { shield_battery: -1 },
        logText: "你抛出重载护盾电池。柔和的能量磁场稳定了机甲核心，驾驶舱盖自动弹开，你成功扶出诺娃！"
      }
    },
    B: {
      text: "超频砸开驾驶舱 (生命-25, 魔能-30)",
      results: {
        stats: { hp: -25, energy: -30 },
        logText: "你魔能超频，一拳一拳强行砸烂了防爆座舱玻璃，抢在机甲核心殉爆前将诺娃拖出！"
      }
    }
  }
};
```

---

### Task 2: 救援第 5 步分支映射与目的地渲染扩展

**Files:**
- Modify: `src/components/WildernessTab.tsx`

**Interfaces:**
- Consumes: `CATHERINE_RESCUE_EVENT`, `BUSTER_RESCUE_EVENT`, `NOVA_RESCUE_EVENT`

- [ ] **Step 1: 在 `drawEvent` 函数内映射新增的救援地点到卡牌**

修改 `drawEvent` 逻辑：

```typescript
  const drawEvent = () => {
    // 救援任务到了第 5 步（steps === 4）
    if (exploration.realityLocationId && exploration.realitySteps >= 4) {
      if (exploration.realityLocationId === 'radar_station') {
        setCurrentEvent(ROY_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'green_ruins') {
        setCurrentEvent(MEI_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'signal_tower') {
        setCurrentEvent(ZERO_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'bio_lab') {
        setCurrentEvent(CATHERINE_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'collapsed_subway') {
        setCurrentEvent(BUSTER_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'military_depot') {
        setCurrentEvent(NOVA_RESCUE_EVENT);
      }
      return;
    }
```

- [ ] **Step 2: 在救援任务按钮渲染（`rescueTargets.map` 循环中）的 `locationName` 翻译字典增加支持**

修改 `locationName` 的判定逻辑：

```typescript
            {/* Rescue explorations */}
            {rescueTargets.map(target => {
              const locationName = 
                target.realityLocationId === 'radar_station' ? '废弃雷达站' :
                target.realityLocationId === 'green_ruins' ? '古代温室废墟' :
                target.realityLocationId === 'signal_tower' ? '高频信号塔' :
                target.realityLocationId === 'bio_lab' ? '生化实验室' :
                target.realityLocationId === 'collapsed_subway' ? '坍塌地铁站' :
                target.realityLocationId === 'military_depot' ? '废弃军火库' : '未知废墟';
```

---

### Task 3: 地表探索开始及抉择负面扣除结算接入凯瑟琳等消耗降低

**Files:**
- Modify: `src/components/WildernessTab.tsx`

- [ ] **Step 1: 在 `handleStartExploration` 中实现同伴的现实探索减耗（zero, catherine）**

修改 `handleStartExploration` 函数：

```typescript
  const handleStartExploration = (locationId: string | null) => {
    const isRescue = locationId !== null;
    let foodCost = isRescue ? 15 : 10;
    let energyCost = isRescue ? 15 : 10;

    // Zero 的被动：存在则魔能消耗 -15%，若已营救则饱食度消耗 -15%
    if (state.survivors.zero) {
      energyCost = Math.round(energyCost * 0.85);
      if (!state.survivors.zero.realityLocationId) {
        foodCost = Math.round(foodCost * 0.85);
      }
    }

    // Catherine 的被动：已被营救，则饱食度消耗 -15%
    if (state.survivors.catherine && !state.survivors.catherine.realityLocationId) {
      foodCost = Math.round(foodCost * 0.85);
    }

    if (player.food < foodCost || player.energy < energyCost) {
      showToast(`生存指标过低（饱食度需 >= ${foodCost}，魔能需 >= ${energyCost}），请先补充！`, "error");
      return;
    }

    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        food: Math.max(0, prev.player.food - foodCost),
        energy: Math.max(0, prev.player.energy - energyCost)
      },
      exploration: {
        ...prev.exploration,
        inRealityExploration: true,
        realitySteps: 0,
        realityLocationId: locationId,
        realityBag: {}
      }
    }));
```

- [ ] **Step 2: 在 `handleMakeChoice` 结算 stats 属性负向扣除时，应用凯瑟琳的 HP / Food 扣减折算被动效果**

修改 `handleMakeChoice` 开头：

```typescript
  const handleMakeChoice = (choice: EventChoice) => {
    // 检查前提条件
    if (choice.requirements) {
      let reqsMet = true;
      Object.entries(choice.requirements).forEach(([item, qty]) => {
        if ((state.inventory[item] || 0) < qty) {
          reqsMet = false;
        }
      });
      if (!reqsMet) {
        showToast("您的避难所库存不足该选项的所需物资！", "error");
        return;
      }
    }

    // 凯瑟琳的消耗降低被动效果判定：若 hasCatherine 或 survivors.catherine 存在，且 stats 扣减为负且属于 hp / food，乘 0.85 并四舍五入。
    let adjustedStats = choice.results.stats ? { ...choice.results.stats } : undefined;
    if (adjustedStats && (state.hasCatherine || state.survivors.catherine)) {
      if (adjustedStats.hp && adjustedStats.hp < 0) {
        adjustedStats.hp = Math.round(adjustedStats.hp * 0.85);
      }
      if (adjustedStats.food && adjustedStats.food < 0) {
        adjustedStats.food = Math.round(adjustedStats.food * 0.85);
      }
    }
```

并将 `setState` 及后面 `nextHp` 计算中引用的 `choice.results.stats` 替换为 `adjustedStats`：

```typescript
      // 1. 改变基础属性
      if (adjustedStats) {
        Object.entries(adjustedStats).forEach(([stat, val]) => {
          const key = stat as keyof typeof newPlayer;
          newPlayer[key] = Math.max(0, Math.min(100, (newPlayer[key] as number) + val));
        });
      }
```

以及：

```typescript
    const nextHp = state.player.hp + (adjustedStats?.hp || 0);
```

---

### Task 4: 遭遇结算中接入巴斯特废铁产出加成

**Files:**
- Modify: `src/components/WildernessTab.tsx`

- [ ] **Step 1: 在 `handleMakeChoice` 的 `setState` 临时背包结算时，对于 `scrap_metal` 且玩家已救出巴斯特，废铁获得数乘以 `1.3` 并四舍五入**

修改 `setState` 里的 `items` 结算逻辑：

```typescript
      // 2. 将物品推入临时背包
      const newRealityBag = { ...prev.exploration.realityBag };
      if (choice.results.items) {
        Object.entries(choice.results.items).forEach(([item, qty]) => {
          let adjustedQty = qty;
          // 巴斯特的废铁加成：已救出（即 state.survivors.buster && !state.survivors.buster.realityLocationId）
          if (item === 'scrap_metal' && qty > 0) {
            const hasBuster = prev.survivors.buster && !prev.survivors.buster.realityLocationId;
            if (hasBuster) {
              adjustedQty = Math.round(qty * 1.3);
            }
          }
          newRealityBag[item] = (newRealityBag[item] || 0) + adjustedQty;
        });
      }
```

---

### Task 5: 验证编译与代码提交

- [ ] **Step 1: 执行 TypeScript 编译校验，确保无类型错误**
`npx tsc --noEmit`

- [ ] **Step 2: 提交代码修改，产出 commit hash 并编写任务报告**
提交修改至 git，并将结果报告文件写入指定路径 `file:///e:/系统/文档/GitHub/IdleCozyGame/.superpowers/sdd/task-4-report.md`。
