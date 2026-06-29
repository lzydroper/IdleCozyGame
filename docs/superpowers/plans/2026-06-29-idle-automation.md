# 避难所智能自动化加工与挂机系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为游戏增加挂机放置加成、避难所设施升级、幸存者岗位排班以及支持配方套娃与原材料消耗限制的工厂离线流水线。

**Architecture:** 
1. 扩展 `src/types/game.ts` 的类型，引入自动化配方、加工设施、避难所基建属性以及派遣状态。
2. 改造 `src/context/GameContext.tsx`，更新 `INITIAL_STATE`；重构 Tick 循环和离线结算算法，加入发电机魔能恢复、回收站废料自动产生、挂机探索（拾荒）以及基于背包材料限制的工厂模拟加工。
3. 新增 `src/components/ShelterTab.tsx` 组件，承载避难所科技树、温室托管、双自动流水线以及挂机探索派遣的所有 UI 交互。
4. 在 `src/App.tsx` 中注册新标签页，并增加离线挂机收益弹窗。

**Tech Stack:** React 18, TypeScript, TailwindCSS/Vanilla CSS, Lucide Icons, Vitest.

## Global Constraints
- 保证离线结算的最长时长不超过 `maxOfflineDuration` (蓄电池等级控制)。
- 挂机流水线加工在扣减原料时，必须在背包原料存量归零或不足时停止，且不得扣成负数。
- 保证幸存者的岗位指派互斥（即指派到避难所岗位时，原温室/其他岗位的指派自动清空）。

---

### Task 1: 扩展数据结构与类型定义

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/context/GameContext.tsx` (初始化部分)

**Interfaces:**
- Consumes: 现有的 `GameState` 和 `Survivor` 类型。
- Produces: 新的 `AutoRecipe`, `AutomationFacility`, `ShelterStats` 接口，以及 `GameState` 的 `shelter` 属性与 `Survivor` 的 `assignedJobId` 属性。

- [ ] **Step 1: 扩展类型定义**
  修改 [src/types/game.ts](file:///e:/系统/文档/GitHub/IdleCozyGame/src/types/game.ts)，新增以下接口并扩展现有接口：
  ```typescript
  export interface AutoRecipe {
    id: string;
    name: string;
    input: Record<string, number>;
    output: Record<string, number>;
    duration: number; // 单次生产耗时（秒）
  }

  export interface AutomationFacility {
    id: string;                     // 'smelter' | 'assembler'
    name: string;
    level: number;                  // 设施等级，升级可缩短加工时间
    activeRecipeId: string | null;  // 当前启用的加工配方，null表示未启用
    currentProgress: number;        // 单次加工进度 (0 - 100)
    timeLeft: number;               // 当前单次加工剩余时间 (秒)
    assignedSurvivorId: string | null; // 派驻的幸存者ID（提供效率加成）
  }

  export interface ShelterStats {
    maxOfflineDuration: number;     // 离线收益结算上限时长（秒），初始 4 小时 (14400)
    batteryLevel: number;           // 蓄电池等级
    generatorLevel: number;         // 发电机等级
    recyclerLevel: number;          // 回收站等级
    facilities: Record<string, AutomationFacility>;
    
    // 岗位分配
    assignedWatererId: string | null;   // 指派自动浇水的幸存者ID
    assignedExplorerId: string | null;  // 指派挂机探索的幸存者ID
    
    // 挂机派遣状态
    expedition: {
      locationId: string | null;       // 派遣目的地，如 'radar_station'
      startTime: number | null;
      lastScavengeTime: number | null;  // 上次拾荒计算时间戳
    };
  }
  ```
  同时在 `Survivor` 接口中添加 `assignedJobId?: string | null`；在 `GameState` 接口中添加 `shelter: ShelterStats` 和 `lastOfflineReport?: OfflineReport | null` 类型（离线收益报告）。

- [ ] **Step 2: 初始化 GameContext 中的新状态**
  修改 [src/context/GameContext.tsx](file:///e:/系统/文档/GitHub/IdleCozyGame/src/context/GameContext.tsx)，在 `INITIAL_STATE` 中加入 `shelter` 的默认配置：
  ```typescript
  shelter: {
    maxOfflineDuration: 14400, // 4小时
    batteryLevel: 1,
    generatorLevel: 0, // 初始未启用自动发电机
    recyclerLevel: 0,  // 初始未启用物资回收站
    facilities: {
      smelter: {
        id: 'smelter',
        name: '魔导冶炼炉',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      },
      assembler: {
        id: 'assembler',
        name: '微型芯片组装台',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      }
    },
    assignedWatererId: null,
    assignedExplorerId: null,
    expedition: {
      locationId: null,
      startTime: null,
      lastScavengeTime: null
    }
  },
  lastOfflineReport: null
  ```

- [ ] **Step 3: 运行已有测试以验证编译**
  运行命令：`npm run test`
  预期：测试通过，无 TypeScript 编译错误。

- [ ] **Step 4: 提交**
  ```bash
  git add src/types/game.ts src/context/GameContext.tsx
  git commit -m "feat: define data structures and initial state for shelter automation"
  ```

---

### Task 2: 挂机生产与派遣的核心逻辑（GameContext 改造）

**Files:**
- Modify: `src/context/GameContext.tsx`
- Modify: `src/context/GameContext.test.tsx`

**Interfaces:**
- Consumes: `GameState`, `ShelterStats`.
- Produces: 新增 `assignSurvivorJob`, `setFacilityRecipe`, `setFacilityActive`, `upgradeShelterStat`, `startExpedition`, `stopExpedition` 操作 API 并在 `GameContextType` 导出。
- 修改 `calculateOfflineProgress` 机制以支持多种挂机结算，并产生 `OfflineReport`。

- [ ] **Step 1: 新定义自动化配方与派遣配置**
  在 `src/context/GameContext.tsx` 中（或者新建一个数据配置文件，为简单起见可以直接在 `GameContext.tsx` 顶部或附近）定义自动配方和派遣地点：
  ```typescript
  export const AUTO_RECIPES: Record<string, AutoRecipe> = {
    smelt_alloy: { id: 'smelt_alloy', name: '提炼合金金属板', input: { scrap_metal: 2 }, output: { alloy_plate: 1 }, duration: 30 },
    smelt_sunflower: { id: 'smelt_sunflower', name: '钢纹花瓣熔炼', input: { steel_petal: 3, scrap_metal: 1 }, output: { alloy_plate: 2 }, duration: 45 },
    assemble_ration: { id: 'assemble_ration', name: '自动合成压缩口粮', input: { glow_fiber: 3 }, output: { ration: 1 }, duration: 20 },
    assemble_energy: { id: 'assemble_energy', name: '能量补充剂组装', input: { glow_fiber: 2, scrap_metal: 1 }, output: { energy_refill: 1 }, duration: 40 },
    assemble_turret: { id: 'assemble_turret', name: '防御炮塔装配', input: { scrap_metal: 3, glow_fiber: 3 }, output: { defensive_turret: 1 }, duration: 90 }
  };

  export const EXPEDITION_LOCATIONS = {
    radar_station: {
      id: 'radar_station',
      name: '雷达站废墟',
      requiredRole: null,
      scavengeInterval: 300,
      lootTable: [
        { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 2 },
        { itemId: 'energy_refill', chance: 0.1, minQty: 1, maxQty: 1 },
        { itemId: 'seed_glow_grass', chance: 0.2, minQty: 1, maxQty: 1 }
      ]
    },
    subway_station: {
      id: 'subway_station',
      name: '坍塌地铁站',
      requiredRole: 'scout',
      scavengeInterval: 240,
      lootTable: [
        { itemId: 'scrap_metal', chance: 0.8, minQty: 1, maxQty: 3 },
        { itemId: 'steel_petal', chance: 0.3, minQty: 1, maxQty: 2 },
        { itemId: 'seed_aether_berry', chance: 0.15, minQty: 1, maxQty: 1 }
      ]
    },
    bio_lab: {
      id: 'bio_lab',
      name: '生化实验室',
      requiredRole: 'engineer',
      scavengeInterval: 360,
      lootTable: [
        { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
        { itemId: 'dream_shard', chance: 0.2, minQty: 1, maxQty: 1 },
        { itemId: 'purifying_serum', chance: 0.05, minQty: 1, maxQty: 1 }
      ]
    }
  };
  ```

- [ ] **Step 2: 编写多功能离线结算核心算法**
  重构 `calculateOfflineProgress` 方法，返回更新后的温室 slots、更新后的背包、以及离线报告：
  ```typescript
  export interface OfflineReport {
    elapsedSeconds: number;
    recoveredEnergy: number;
    recoveredItems: Record<string, number>; // 包含发电机、收集器、挂机派遣、流水线产出
    logs: string[];
  }

  export function calculateDetailedOfflineProgress(
    state: GameState,
    elapsedSeconds: number
  ): { updatedState: GameState; report: OfflineReport } {
    // 1. 时间截断
    const actualSeconds = Math.min(elapsedSeconds, state.shelter.maxOfflineDuration);
    const reportLogs: string[] = [];
    const recoveredItems: Record<string, number> = {};

    let currentInventory = { ...state.inventory };
    let currentEnergy = state.player.energy;

    // 2. 发电机与回收站自动产出
    let energyGained = 0;
    if (state.shelter.generatorLevel > 0) {
      // 幸存者在发电机岗位或基准产出
      const speedBonus = 1 + (state.survivors[state.shelter.facilities.smelter.assignedSurvivorId || '']?.role === 'engineer' ? 0.5 : 0);
      energyGained = Math.floor(actualSeconds * (state.shelter.generatorLevel * 0.005) * speedBonus);
      currentEnergy = Math.min(state.player.maxEnergy, currentEnergy + energyGained);
      if (energyGained > 0) {
        reportLogs.push(`⚡ 避难所魔能发电机在挂机期间累计凝聚了 ${energyGained} 点魔能。`);
      }
    }

    let scrapGained = 0;
    if (state.shelter.recyclerLevel > 0) {
      scrapGained = Math.floor(actualSeconds * (state.shelter.recyclerLevel * 0.002));
      if (scrapGained > 0) {
        currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) + scrapGained;
        recoveredItems.scrap_metal = (recoveredItems.scrap_metal || 0) + scrapGained;
        reportLogs.push(`🔧 物资回收站自动收集并提炼了 ${scrapGained} 个废旧金属。`);
      }
    }

    // 3. 挂机派遣拾荒结算
    const exp = state.shelter.expedition;
    if (exp.locationId && state.shelter.assignedExplorerId) {
      const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
      if (loc) {
        const explorer = state.survivors[state.shelter.assignedExplorerId];
        // 拾荒间隔受幸存者效率加成（如侦察兵提升20%效率即间隔减少20%）
        const speedBonus = 1 + (explorer?.role === 'scout' ? explorer.bonus : 0);
        const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval / speedBonus));
        const scavengeTicks = Math.floor(actualSeconds / actualInterval);
        
        let scavengedCount: Record<string, number> = {};
        for (let i = 0; i < scavengeTicks; i++) {
          loc.lootTable.forEach(loot => {
            if (Math.random() <= loot.chance) {
              const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
              scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
            }
          });
        }
        
        Object.entries(scavengedCount).forEach(([itemId, qty]) => {
          currentInventory[itemId] = (currentInventory[itemId] || 0) + qty;
          recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
        });

        if (Object.keys(scavengedCount).length > 0) {
          reportLogs.push(`🤠 幸存者 ${explorer?.name || '探索员'} 挂机探索 ${loc.name} 结束，带回了物资。`);
        }
      }
    }

    // 4. 工厂自动化流水线结算（考虑原材料扣减限制）
    const updatedFacilities = { ...state.shelter.facilities };
    Object.entries(updatedFacilities).forEach(([facId, facility]) => {
      if (!facility.activeRecipeId) return;
      const recipe = AUTO_RECIPES[facility.activeRecipeId];
      if (!recipe) return;

      const operator = state.survivors[facility.assignedSurvivorId || ''];
      const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (facility.level - 1) * 0.1;
      const actualDuration = Math.max(1, recipe.duration / speedBonus);

      // 计算能运行的最大加工次数
      const maxCycles = Math.floor(actualSeconds / actualDuration);
      if (maxCycles <= 0) return;

      // 计算因背包原材料限制的极限加工次数
      let limitCycles = maxCycles;
      Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
        const available = currentInventory[itemId] || 0;
        const possibleCycles = Math.floor(available / qtyNeeded);
        limitCycles = Math.min(limitCycles, possibleCycles);
      });

      if (limitCycles > 0) {
        // 扣除材料
        Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
          currentInventory[itemId] = Math.max(0, (currentInventory[itemId] || 0) - qtyNeeded * limitCycles);
        });
        // 增加产物
        Object.entries(recipe.output).forEach(([itemId, qtyProduced]) => {
          const totalQty = qtyProduced * limitCycles;
          currentInventory[itemId] = (currentInventory[itemId] || 0) + totalQty;
          recoveredItems[itemId] = (recoveredItems[itemId] || 0) + totalQty;
        });
        reportLogs.push(`🏭 ${facility.name} 离线运转 ${limitCycles} 次，加工出 ${recipe.name} 产物。`);
      }
    });

    // 5. 温室作物离线生长结算
    const isWateredOffline = state.shelter.assignedWatererId !== null;
    const updatedSlots = state.greenhouse.slots.map(slot => {
      if (!slot.cropId) return slot;
      const config = CROPS_CONFIG[slot.cropId];
      if (!config) return slot;

      // 如果有指派的幸存者托管浇水，则生长速度始终翻倍
      const speedMultiplier = (slot.isWatered || isWateredOffline) ? 2 : 1;
      const timeReduced = actualSeconds * speedMultiplier;
      const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
      const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

      return {
        ...slot,
        growthTimeLeft: newTimeLeft,
        growthProgress: progress,
        isWatered: isWateredOffline ? true : slot.isWatered // 顺便保持浇水状态
      };
    });

    const updatedState: GameState = {
      ...state,
      player: { ...state.player, energy: currentEnergy },
      inventory: currentInventory,
      greenhouse: { ...state.greenhouse, slots: updatedSlots },
      shelter: {
        ...state.shelter,
        facilities: updatedFacilities
      }
    };

    return {
      updatedState,
      report: {
        elapsedSeconds,
        recoveredEnergy: energyGained,
        recoveredItems,
        logs: reportLogs
      }
    };
  }
  ```

- [ ] **Step 3: 完善 GameContext 中的 Tick 定时器**
  修改 `GameContext.tsx` 中的秒级 `setInterval` 定时器：
  - 每秒发电机和回收站按产率直接将魔能和废金属充入状态。
  - 对于启用的加工厂，更新其 `timeLeft` 并折算进度。一旦进度达到 100% 且有足够原料，则完成一轮生产并进入下一轮。
  - 对于派遣探索的幸存者，每秒检测是否到了拾荒间隔，若是则执行拾荒并将产出加入背包。

- [ ] **Step 4: 实现避难所操作 API (API Methods)**
  在 `GameContext.tsx` 中编写核心操作接口：
  - `assignSurvivorJob(survivorId, jobId)`: 更新幸存者状态及岗位，需要互斥处理（比如原岗位需要被置空）。
  - `setFacilityRecipe(facilityId, recipeId)`: 设置配方并重置进度。
  - `setFacilityActive(facilityId, active)`: 控制启用状态。
  - `upgradeShelterStat(statType)`: 消耗材料升级电池、发电机、回收站和加工厂。
  - `startExpedition(survivorId, locationId)`: 开始挂机派遣。
  - `stopExpedition()`: 停止派遣。
  导出这些 API 供 UI 调用。

- [ ] **Step 5: 在账号加载及初始化时接入多功能离线结算**
  修改 `switchAccount` 和 `createAccount` 载入逻辑，将单纯调用 `calculateOfflineProgress` 换成调用新的 `calculateDetailedOfflineProgress`，并将结算报告 `report` 存入 `state.lastOfflineReport` 中。

- [ ] **Step 6: 编写 Vitest 单元测试验证核心计算**
  在 `src/context/GameContext.test.tsx` 编写自动化工厂离线结算的验证代码。
  运行：`npx vitest src/context/GameContext.test.tsx`
  预期：测试通过。

- [ ] **Step 7: Commit**
  ```bash
  git add src/context/GameContext.tsx src/context/GameContext.test.tsx
  git commit -m "feat: implement multi-stage offline calculation and shelter API"
  ```

---

### Task 3: 避难所/自动化标签页 UI 实现 (`ShelterTab.tsx` 新增)

**Files:**
- Create: `src/components/ShelterTab.tsx`

**Interfaces:**
- Consumes: `GameContext` (提供 `state`, `assignSurvivorJob`, `upgradeShelterStat` 等方法)。
- Produces: 避难所/控制中心交互界面。

- [ ] **Step 1: 新建 ShelterTab 组件**
  创建 [src/components/ShelterTab.tsx](file:///e:/系统/文档/GitHub/IdleCozyGame/src/components/ShelterTab.tsx)，实现四大 UI 区域布局：
  - **避难所属性与升级控制**（电池、发电机、回收站的级别和挂机时长上限升级）。
  - **温室工厂托管监控**（显示温室总进度、阿梅的自动浇水派驻状态、提供一键浇水/收获操作）。
  - **工业自动流水线（冶炼炉、微型组装台）**（显示选配方、幸存者岗位加成、进度条和开/关按钮）。
  - **挂机远征探索派遣**（派遣列表、出发按钮、拾荒状态倒计时和召回/结算操作）。

- [ ] **Step 2: 样式与美化**
  利用精美的 CSS 气泡、发光进度条和魔能科技风设计（例如：发光边框 `.border-cyan-500`、动画进度条 `.animate-pulse` 等），让玩家进入标签页时能切实感受到自动工厂的运转。

- [ ] **Step 3: 提交**
  ```bash
  git add src/components/ShelterTab.tsx
  git commit -m "feat: add ShelterTab component for base automation controls"
  ```

---

### Task 4: 主界面整合与状态联动 (`App.tsx` 改造)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ToastSystem.tsx` (如有需要)

**Interfaces:**
- Consumes: `useGame` 中的状态。
- Produces: 标签导航中新增的「避难所」入口，以及首次加载/切换账号时自动弹出的「离线收益报告结算弹窗」。

- [ ] **Step 1: 注册 Tab 导航**
  修改 [src/App.tsx](file:///e:/系统/文档/GitHub/IdleCozyGame/src/App.tsx)，在 `activeTab` 类型中添加 `'shelter'`。
  在导航栏的标签页列表中添加 **避难所/总控 (Shelter)** 标签页（使用 `Lucide` 里面的 `Settings` 或 `ShieldAlert`，或引入新图标如 `Terminal`）。
  当 `activeTab === 'shelter'` 时，渲染 `<ShelterTab />`。

- [ ] **Step 2: 编写离线挂机收益报告弹窗 (Offline Summary Modal)**
  在 `App.tsx` 的合适位置（或专门弹窗组件），如果监听到 `state.lastOfflineReport` 存在：
  - 弹出一个科技风蒙层弹窗，显示：
    - "💾 欢迎归来，生存者！避难所离线运转报告："
    - 离线时间（折算成小时、分、秒）。
    - 累计获得魔能（Energy）。
    - 自动拾荒/加工生产出的所有物品总览（Emoji 列表）。
    - 包含“收下物资”按钮，点击后清空 `state.lastOfflineReport = null` 并关闭弹窗。

- [ ] **Step 3: 进行编译与功能验证**
  运行命令：`npm run build`
  确认无 TypeScript 报错，全部构建成功。

- [ ] **Step 4: 提交**
  ```bash
  git add src/App.tsx
  git commit -m "feat: integrate ShelterTab into App and add offline summary modal"
  ```
