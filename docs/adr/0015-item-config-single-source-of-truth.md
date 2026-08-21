# 物品配置单一真相源：分域目录与内聚图标

Status: accepted

## 背景

物品的数据配置零碎，单个物品的「定义」分散于多处，同一 id 需多文件同步维护：

- **四处分散**：元数据（`src/data/items.ts` 的 `ITEMS_CONFIG`）、sprite 索引（`GameIcon.tsx` 的 `ICON_CONFIG`）、Lucide 回退（`iconMaps.ts`）、掉落/配方/消耗表中的裸 id 引用；
- **装备双份定义**：12 件系列装备同时在 `ITEMS_CONFIG` 与 `EQUIPMENT_CONFIG` 定义 `name`/`description`，易漂移；
- **配置腐坏实证**：
  - `void_core` 与 `void_essence` 共用 materials sheet index 9（sprite 冲突）；
  - `energy_cell` 是 `ShelterTab`「魔能储备」的装饰图标，无物品定义，却混入物品图标注册表（sprite + Lucide 映射）；
  - `public/assets/spritesheet_items.png` 存在但无任何代码引用；
  - `discoveredBlueprints` 为死字段（仅初始化，全项目无读写逻辑）；
  - `items.ts` 内的 spritesheet 索引注释与 `ICON_CONFIG` 重复维护；
- **作物图标遗留**：7 个旧作物引用 `src/assets/crop_*.jpg` 单图，9 个新作物无图（UI 用 Sprout 图标占位）；spritesheet 中无作物 sprite，作物与种子视觉无映射。

## 决策

- **物品定义重组为分域目录** `src/data/items/`：`props.ts`（道具）、`resources.ts`（资源）、`shards.ts`（碎片）、`equipment.ts`（装备）+ `index.ts` 聚合导出唯一注册表。
- **sprite 配置并入物品定义**：`ItemMeta` 增加 sprite（sheet + index）与 Lucide 回退字段，删除 `GameIcon.tsx` 内的 `ICON_CONFIG`；`GameIcon` 变为纯渲染器（按物品定义渲染，未命中 sprite 时 Lucide 占位）。
- **`EQUIPMENT_CONFIG` 为装备真相源**：装备类物品条目（name/description/category）由它派生，不在物品目录重复定义。
- **作物图标去单图化**：删除 `CropConfig.image` 字段与 7 张 `crop_*.jpg`，作物图标以 Lucide 占位（spritesheet 无作物 sprite，后续补图时统一走 sprite 配置）。
- **清理项**：`energy_cell` 装饰图标从物品注册表剥离（ShelterTab 直接渲染 Lucide）；删除无引用的 `spritesheet_items.png`；删除 `discoveredBlueprints` 死字段；修正 `void_core` sprite 索引冲突。

## Considered Options

- **保持分散 + 图标独立文件集中管理**：元数据与图标仍是两处真相源，未解决「同一 id 两处同步」问题。否决。
- **装备双份保留 + 一致性测试校验**：漂移风险与维护成本仍在。否决。
- **作物复用对应种子 sprite**：作物与种子视觉混淆，且作物收获展示与种植语义不符。否决。
- **新增作物 spritesheet**：需要美术资源，现阶段不满足，留待 sprite 化二期。否决（本轮）。

## Consequences

- 新增物品只需在对应分域文件添加一条（元数据 + 图标内聚），`GameIcon` 无需改动；
- 实施时对全部裸 id 引用做注册表校验，杜绝孤儿 id（如 `energy_cell`）；
- `GameIcon.tsx` 与 `iconMaps.ts` 大幅精简；
- 温室/种植 UI 的作物图标短期为 Lucide 占位样式，后续补 sprite 时只需在物品定义加 sprite 字段。
