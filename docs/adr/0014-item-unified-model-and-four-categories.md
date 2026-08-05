# 物品统一模型：全经济实体物品化与四分类

Status: accepted

## 背景

物品系统的分类与存储存在三处结构性问题：

- **分类语义与展示脱节**：`ItemMeta.category` 为五值枚举（`seed` / `material` / `food` / `equipment` / `special`），其中 `equipment` 混入消耗品（`energy_refill`、`stimpack`、`canteen` 等，ticket 22 遗留）；UI 分类切页（消耗品=food、装备=equipment、材料=material+seed、碎片=special）依赖匹配函数修正，数据语义与展示语义不一致。
- **经济实体游离于背包之外**：灵魂残响（`soulEchoes`）、共鸣碎片（`resonanceShards`）、英雄专属灵魂碎片（`soulShards`）是 `GameState` 顶层字段，玩家在背包中不可见；而奥术星体（`arcane_orb`）已走 `inventory`——同类经济实体两套存储方式并存，读写分散。
- **special 类语义混杂**：梦境碎片（`dream_shard`）是作物产物与配方原料，名称含「碎片」却非英雄碎片/觉醒素材，无法仅凭名称判定归属。

## 决策

- **所有可流转经济实体一律物品化**，统一存放于 `inventory`：灵魂残响、共鸣碎片、英雄专属灵魂碎片（以复合物品 id `shard_<heroId>` 表示，每英雄一个背包条目）。
- **物品分类收敛为四类**，数据层枚举改为 `'item' | 'resource' | 'shard' | 'equipment'`（道具/资源/碎片/装备），语义边界：
  - **道具 (item)**：可主动使用的物品（食物、药剂、可部署装置等），使用后产生即时效果；
  - **资源 (resource)**：不可主动使用、但会被生产与建造行为消耗的物品（生产原料、种子、货币）；
  - **碎片 (shard)**：英雄碎片与觉醒素材（灵魂碎片、共鸣碎片、奥术星体）；
  - **装备 (equipment)**：可穿戴的系列装备及装备生态物品（强化素材、装备图纸）。
- 背包分类 tab 直接绑定枚举值，删除现有匹配函数。
- **体力（stamina）与胶囊充能（capsulesCharge）不物品化**：前者为可再生时间资源、后者为按次数计费的独立资源，均非可流转经济实体，保持 `GameState` 独立字段。
- **不提供任何旧存档兼容**：旧存档视为测试数据直接舍弃，读取时按新默认初始化，无迁移代码（alpha 决策，与 ADR-0013 一致）。

## Considered Options

- **保留顶层字段 + inventory 展示层合并**：双真相源，两处同步易漂移，「全面物品化」落空。否决。
- **旧存档尽力迁移（顶层字段并入 inventory）**：一次性迁移代码仅在 alpha 期有用；当前无真实玩家数据。否决。
- **保留五值枚举仅调整 UI 映射**：`seed`/`food` 描述的是用途而非分类维度，数据层语义继续错乱。否决。
- **体力/胶囊一并物品化**：非可流转实体，物品化徒增背包噪音与逻辑改动面。否决。

## Consequences

- `GameState` 删除 `soulEchoes` / `resonanceShards` / `soulShards` 顶层字段；召唤、升星、觉醒、战斗掉落、离线结算与相关 UI 全部改读 `inventory`。
- 背包四分类 tab 直接映射枚举值；`LogTab` 的 `BACKPACK_CATEGORIES` 匹配函数删除。
- 旧存档（含上述字段的格式）读取时按新默认初始化。
- 全量测试 fixture（`GameContext.test.tsx`、`expansion.test.tsx` 等）同步更新。
