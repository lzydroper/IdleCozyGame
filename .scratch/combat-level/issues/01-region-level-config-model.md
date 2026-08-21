# 01 — Region/Level 双表数据模型

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

`src/data/regions.ts` 与 `src/data/levels.ts` 的最终 TS schema 如何定？需决议：

1. **`RegionConfig` 字段集与职责边界**：`id / name / description / enemyPool / explorationEvents / explorationStepsToClear / explorationMilestones / levelIds / unlock / expedition? / initialCost? / isTestZone?` 哪些入 Region，哪些入 Level，哪些留 fog。
2. **`LevelConfig` 字段集**：`id / regionId / name / enemies / drops / firstClearDrops?` 之外是否还要 `staminaCost`（体力消耗）与推荐等级；关卡是否完全同构、无 boss 字段。
3. **两表关系**：`RegionConfig.levelIds` 为有序数组，末位即区域关底；`LEVEL_CONFIGS` 以 level id 为 key；如何导出 `LEVEL_INDEX` 与「区域 → 有序关卡」推导。
4. **全 JSON 化兼容**：配置只含纯数据、类型用 `satisfies` 保字面量、id 显式稳定、禁止函数与运行时推导逻辑。

产出：`RegionConfig` / `LevelConfig` 类型草案与两表拆分边界，供 02/03/04/05/06/07/08/10 直接引用。

## Answer

（HITL grilling，用户最终选择：**Region 内嵌 levels + 每关只带区域内 local id**；单文件 `src/data/regions.ts`。已取代上一版「双表 + 全局 id」草案。）

- **D1 组织**：只建 `src/data/regions.ts`；`REGION_CONFIGS: Record<regionId, RegionConfig>`，每个 region 内嵌有序 `levels`。不设 `src/data/levels.ts`，不设全局 `LEVEL_CONFIGS`。
- **D2 RegionConfig**：`id / name / description / order / recommendedLevel / icon? / enemyPool / explorationEvents / explorationStepsToClear / explorationMilestones / levels / unlock? / expedition? / initialCost? / isTestZone?`。
- **D3 LevelConfig**：`id / name / enemies / staminaCost / drops / firstClearDrops?`。`id` 是**区域内稳定 local id**（如 `"01"` / `"boss"`），不是全局 id；无 `regionId`、无 recommendedLevel、无 boss 字段；BOSS 只体现为 `enemies` 中 `role:'boss'` 的敌人。
- **D4 关卡身份与通关记录**：全球唯一身份在需要时由 `regionId + ':' + levelId` 派生，但配置与状态都不存该复合串。通关记录改为 `clearedLevels: Record<regionId, string[]>`，存各区域已通关的 local id 数组；区域通关 = 该区域 `levels` 末位的 local id 已在该数组中。
- **D5 主线顺序**：`RegionConfig.order: number` 升序为主线程顺序，`isTestZone` 排除；`recommendedLevel` 仅作展示。
- **D6 视觉字段**：仅 `RegionConfig.icon?` 预留 Lucide 映射 key；`LevelConfig` 不设视觉字段。
- **D7 JSON 兼容**：`regions.ts` 只含纯数据 + 类型；用 `satisfies` 保留字面量推导；只允许 `import type`；禁止函数、运行时计算与跨配置值 import；local id 在区域内显式稳定；校验先只靠 `tsc`。

```ts
// src/data/regions.ts（草案，字段细节由 02/03/04/05/06/07 定稿）
export interface RegionConfig {
  id: string;
  name: string;
  description: string;
  order: number;                       // 主线顺序（isTestZone 排除）
  recommendedLevel: number;            // 仅展示
  icon?: string;                       // Lucide 映射 key，UI seam
  enemyPool: string[];                 // 区域全部敌人
  explorationEvents: string[];         // 区域事件 id 池
  explorationStepsToClear: number;     // 探索 100% 目标步数
  explorationMilestones: { atPercent: number; eventId: string }[]; // 一次性节点，04 定稿
  levels: LevelConfig[];               // 有序，末位 = 关底；local id 区域内唯一
  unlock?: RegionUnlockRequirements;   // 03 定稿
  expedition?: ExpeditionConfig;       // 07 定稿
  initialCost?: { food: number; energy: number }; // 05 定稿
  isTestZone?: boolean;
}

export interface LevelConfig {
  id: string;                          // 区域内稳定 local id（01/boss），非全局
  name: string;
  enemies: string[];                   // 必须是 region.enemyPool 子集，06 定稿
  staminaCost: number;
  drops: DropEntry[];                  // 02 定稿
  firstClearDrops?: DropEntry[];       // 首通额外，可空
}
```
