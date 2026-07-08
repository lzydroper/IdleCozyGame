# 全数据驱动重构设计文档

将游戏中 24 处硬编码数据迁移至 `src/data/` 的配置文件，实现纯数据驱动。

---

## 1. 策略

**类型先行，分批迁移**，共 3 批：

| 批次 | 内容 | 原则 |
|---|---|---|
| 第一批 | 纯数据移动（拆文件，不改逻辑） | 只剪贴，零行为变更 |
| 第二批 | 新增配置维度（给现有接口加字段） | 消费方统一用配置走，消除 if/else |
| 第三批 | 消灭剩余常量 | 收尾清理 |

---

## 2. 类型与接口定义

### 2.1 给 `src/data/items.ts` 增加使用效果

```typescript
// ItemMeta 新增字段
export interface ItemMeta {
  // ... 现有字段不变
  useEffect?: {
    stats?: Partial<PlayerStats>;
    pollution?: number;  // 负数=减少污染
  };
}
```

替换 `GameContext.tsx:1239-1254` 中 `useSupplyItem` 的 switch 语句。

### 2.2 给 `src/data/survivors.ts` 增加被动配置

```typescript
export interface PassiveEffect {
  type: 'exploration_cost' | 'stat_cost' | 'item_yield' | 'max_energy' | 'craft_energy' | 'growth_speed' | 'defense_cost';
  target?: string;     // 'food' | 'energy' | 'hp' | 'scrap_metal' | 'energy' ...
  multiplier: number;  // 0.85 = -15%, 1.3 = +30%, 固定值用 flatBonus
  flatBonus?: number;  // 例如 Nova +30 maxEnergy
  condition?: 'rescued' | 'assigned'; // 触发条件
}
```

替换以下 4 处硬编码的幸存者特殊判定：
- `WildernessTab.tsx` 中 Zero/Catherine/Buster 的 if/else
- `GameContext.tsx` 中 Mei/Nova 的幸存者 ID 检查
- `WorkshopTab.tsx` 中 Nova 的防御消耗检查
- `SwipeCard.tsx` 中 Catherine/Buster 的加成计算

### 2.3 新增 `src/types/config.ts`

```typescript
// 统一的配置类型，仅用于第一批纯数据文件
export interface UpgradePath {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costFormula: { baseCost: number; costPerLevel: number };
  effects: Array<{
    type: string;
    baseValue: number;
    increment: number;
  }>;
}

export interface RescueEventMapping {
  locationId: string;
  eventId: string;
}
```

---

## 3. 第一批：纯数据移动（零行为变更）

创建以下 4 个新文件，从现有文件剪贴内容，消费方只改 import 路径。

### 3.1 `src/data/crops.ts`

从 `GameContext.tsx:59-123` 搬出 `CROPS_CONFIG`。将图片 import 移到该文件。

**消费方变更**：`GameContext.tsx` + `ShelterTab.tsx` 的 import 从 `'../context/GameContext'` 改为 `'../data/crops'`。

### 3.2 `src/data/autoRecipes.ts`

从 `GameContext.tsx:13-19` 搬出 `AUTO_RECIPES`。`AutoRecipe` 接口增加 `facilityId: 'smelter' | 'assembler'` 字段（替代 `ShelterTab.tsx:207-208` 的 `startsWith('smelt_')` 前缀过滤）。

### 3.3 `src/data/expeditionLocations.ts`

从 `GameContext.tsx:21-55` 搬出 `EXPEDITION_LOCATIONS`。`EXPEDITION_LOCATIONS` 类型增加 `displayName` 字段（替代 `WildernessTab.tsx:508-514` 和 `DreamscapeTab.tsx:191-193` 的 location 名称三元运算）。

### 3.4 `src/data/rescueEvents.ts`

从 `WildernessTab.tsx:12-155` 搬出 6 个救援事件对象（`ROY_RESCUE_EVENT` ~ `NOVA_RESCUE_EVENT`），同时搬出 `WildernessTab.tsx:183-198` 的 location→event 映射表。

---

## 4. 第二批：新增配置维度

### 4.1 物品使用效果

`items.ts` 中给 `hot_stew`、`nanite_injector`、`purifying_serum`、`ration`、`energy_refill` 加上 `useEffect` 字段后，`GameContext.tsx` 的 `useSupplyItem` 函数从 switch 改为：

```typescript
const meta = ITEMS_CONFIG[itemId];
if (!meta?.useEffect) return prev;
// 读取 meta.useEffect 驱动 stat 变化
```

### 4.2 幸存者被动系统

`survivors.ts` 中给每位幸存者加上 `passives: PassiveEffect[]` 数组后，消费方统一读取该配置：

```typescript
// 例如 WildernessTab 中 Zero 的探索消耗减成：
const zeroPassive = survivorsConfig.zero.passives.find(p => p.type === 'exploration_cost');
if (zeroPassive) energyCost = Math.round(energyCost * zeroPassive.multiplier);
```

消除 `WildernessTab.tsx:257-267`、`WildernessTab.tsx:320-327`、`WildernessTab.tsx:376-381`、`GameContext.tsx:449-450`、`GameContext.tsx:667-668`、`GameContext.tsx:270-271`、`GameContext.tsx:1584-1587`、`WorkshopTab.tsx:112-113` 的所有幸存者 ID 硬判断。

### 4.3 设施升级路径

`src/data/shelterUpgrades.ts`：

```typescript
export const SHELTER_UPGRADES: Record<string, UpgradePath> = {
  battery: {
    id: 'battery',
    name: '蓄电池',
    description: '延长离线收益结算上限',
    maxLevel: 10,
    costFormula: { baseCost: 10, costPerLevel: 10 },  // level 1=10, level 2=20 ...
    effects: [{ type: 'maxOfflineDuration', baseValue: 14400, increment: 3600 }]
  },
  generator: {
    id: 'generator',
    name: '发电机',
    maxLevel: 10,
    costFormula: { baseCost: 15, costPerLevel: 15 },  // level 1=30, level 2=45 ...
    effects: [{ type: 'generatorRate', baseValue: 0.005, increment: 0.005 }]
  },
  recycler: {
    id: 'recycler',
    name: '回收站',
    maxLevel: 10,
    costFormula: { baseCost: 15, costPerLevel: 15 },
    effects: [{ type: 'recyclerRate', baseValue: 0.002, increment: 0.002 }]
  },
  smelter: {
    id: 'smelter',
    name: '熔炼炉',
    maxLevel: 5,
    costFormula: { baseCost: 20, costPerLevel: 20 },
    effects: [{ type: 'speedBonus', baseValue: 0.1, increment: 0.1 }]
  },
  assembler: {
    id: 'assembler',
    name: '组装台',
    maxLevel: 5,
    costFormula: { baseCost: 20, costPerLevel: 20 },
    effects: [{ type: 'speedBonus', baseValue: 0.1, increment: 0.1 }]
  }
};
```

替换 `GameContext.tsx:1421-1490` 中 `upgradeShelterStat` 函数的 if/else 升级逻辑和 `ShelterTab.tsx:135-148` 中的 UI 费用显示逻辑。同时也替换 `GameContext.tsx:1465` 的 `14400 + (nextLevel - 1) * 3600` 硬编码公式以及 `GameContext.tsx:277/297/637/642/362/692` 中的速率/速度加成公式。

---

## 5. 第三批：剩余常量

### 5.1 `src/data/initialState.ts`

从 `GameContext.tsx:126-230` 搬出初始状态定义：

```typescript
export const INITIAL_PLAYER_STATS: PlayerStats = { ... };
export const INITIAL_INVENTORY: Record<string, number> = { ... };
export const INITIAL_DISCOVERED_BLUEPRINTS: string[] = [ ... ];
// 等等
```

### 5.2 `src/data/nightmareConfig.ts`

```typescript
export const NIGHTMARE_CONFIG = {
  dreamLeakDamage: 60,
  turretDamage: 35,
  turretReward: { void_core: 1 },
  overloadBaseCost: 20,
  overloadNovaCost: 10,
  overloadBaseDamage: 15,
  overloadNovaDamage: 20,
};
```

替换 `DreamscapeTab.tsx:163` 和 `WorkshopTab.tsx:77-147` 中的硬编码数值。

### 5.3 `src/data/gameConstants.ts`

```typescript
export const GAME_CONSTANTS = {
  GAME_DAY_SECONDS: 300,
  WATER_ENERGY_COST: 2,
  GREENHOUSE_MAX_SLOTS: 8,
  GREENHOUSE_EXPANSION_INCREMENT: 2,
  EXPLORATION_BASE_FOOD_COST: 10,
  EXPLORATION_BASE_ENERGY_COST: 10,
  EXPLORATION_RESCUE_FOOD_COST: 15,
  EXPLORATION_RESCUE_ENERGY_COST: 15,
};
```

替换 `GameContext.tsx:614`、`GameContext.tsx:973-1016`、`GameContext.tsx:1181-1205`、`WildernessTab.tsx:253-254` 中的纯常量。

### 5.4 删除重复数据

- `ShelterTab.tsx:28-35` 的 `SURVIVOR_EMOJIS` → 直接从 `survivors.ts` 读取
- `WildernessTab.tsx:205-210` 的 `CATEGORY_WEIGHTS` → 移至 `realityEvents.ts` 的导出常量

---

## 6. 迁移顺序

```
第1步：src/types/config.ts          ← 新增类型
第2步：src/data/crops.ts             ← 从 GameContext 剪贴
第3步：src/data/autoRecipes.ts       ← 从 GameContext 剪贴
第4步：src/data/expeditionLocations.ts ← 从 GameContext 剪贴
第5步：src/data/rescueEvents.ts      ← 从 WildernessTab 剪贴
第6步：更新消费方 import              ← GameContext / ShelterTab / WildernessTab
------ 第一批完成，可部署 ------
第7步：items.ts 增加 useEffect        ← 改 useSupplyItem
第8步：survivors.ts 增加 passives     ← 改 4 个文件
第9步：shelterUpgrades.ts 新建        ← 改 upgradeShelterStat
------ 第二批完成，可部署 ------
第10步：initialState.ts 新建          ← 纯剪贴
第11步：nightmareConfig.ts 新建        ← 常数提取
第12步：gameConstants.ts 新建          ← 常数提取
第13步：清理重复数据/过时代码          ← 删除 SURVIVOR_EMOJIS 等
------ 第三批完成 ------
```

每个步骤完成后都执行 `npx vitest run` 和 `npm run build` 确保不破坏功能。

---

## 7. 不涉及变更的内容

- `src/data/realityEvents.ts` 和 `src/data/dreamEvents.ts` 的事件结构本身已经是数据驱动的，不做改动
- `GameContext.tsx` 的业务逻辑不变，只改 import 路径和数据读取方式
- `GameState` 接口不变，只新增 `src/types/config.ts`
