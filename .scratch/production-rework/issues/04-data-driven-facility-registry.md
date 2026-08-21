# 04 — 数据驱动设备注册架构

Type: grilling

Status: resolved

Blocked by: None — can start immediately

## Question

"新增设备种类只需加配置"的数据驱动架构，其配置形状与泛化边界是什么？

需要决策的子问题：

1. **设备配置表**：新增/复用哪个配置？候选：
   - a) 扩展现有 `SHELTER_UPGRADES`（已是 `Record<string, UpgradePath>`，但混入了非设备项 battery/generator/recycler，且升级语义耦合）
   - b) 新建独立 `FACILITIES_CONFIG: Record<string, FacilityConfig>`（设备名、图标、每级效率/队列容量→改为每级速度、扩建费用/耗时、可生产配方列表），`FacilityType` 从配置表推导
   - 倾向哪个？理由？
2. **`FacilityType` 泛化边界**：`type FacilityType = 'smelter' | 'assembler'` 硬编码出现在 `types/game.ts`、`state/facility.ts`、`state/tick.ts`、`state/offline.ts`、`state/persistence.ts`、`FacilityCard.tsx`、`ShelterTab.tsx`、`duty.ts`（加成作用域）等。泛化为 `string`（运行时按配置校验）还是保留联合类型但由配置推导（`keyof typeof FACILITIES_CONFIG`）？类型安全与可扩展性的权衡。
3. **新增一台设备（如"研磨机"）的完整改动清单**：配置一条 + 图标注册（`GameIcon` 的 upgrade 注册表走 `SHELTER_UPGRADES[id].icon`，若迁到新表要同步）+ 产线 tab 渲染（`FacilityCard` 的 `SmelterCard`/`AssemblerCard` 硬编码导出——需泛化为配置驱动渲染）+ 驻守加成作用域（`resolveDutyBonus` 的 `facilityType` 过滤）+ 自动配方 `facilityId` 类型。列出必须触碰的点，确认无遗漏。
4. **与 0019 升级耗时机制的关系**：0019 的 `upgradeShelterStat`/`getShelterUpgradeKey`/`ShelterStats.upgrades` 以 `UpgradeStatType = ... | FacilityType` 硬编码设备类型。设备注册泛化后，升级机制是否同步泛化（`upgradeShelterStat(statType: string)` + 配置驱动校验），还是本次只泛化生产侧、升级侧保持现状（新设备需在升级类型上手工加一行）？

## Context

- 硬编码点：`types/game.ts:213`（`FacilityType`）、`FacilityCard.tsx:508-539`（`SmelterCard`/`AssemblerCard` 硬编码导出）、`state/facility.ts`（`FACILITY_EXPANSION` 类型 `Record<'smelter'|'assembler',...>`）、`state/duty.ts`（加成作用域过滤 `facilityType`）、`SHELTER_UPGRADES` 的 `category: 'facility'` 项。
- 用户已拍板：数据驱动重构、设备类型可配置扩展。

## Resolution

**决议（用户拍板）**：

1. **新建独立 `FACILITIES_CONFIG`**（`src/data/facilities.ts`）：
   ```ts
   interface FacilityConfig {
     id: string;
     name: string;
     description?: string;
     icon: LucideIcon;                                  // GameIcon upgrade 注册
     maxLevel: number;
     levels: UpgradeLevel[];                            // 升级（复用 cost/effect/duration）
     expansion: { maxUnits: number; costs: Record<string, number>[]; durations: number[] };
   }
   export const FACILITIES_CONFIG = { smelter: {...}, assembler: {...} } satisfies Record<string, FacilityConfig>;
   export type FacilityType = keyof typeof FACILITIES_CONFIG;   // satisfies 保留字面量 key，类型安全不丢
   ```
   `FACILITY_EXPANSION` 并入各设备配置的 `expansion` 字段，不再单独存在。
2. **`SHELTER_UPGRADES` 收敛**：只保留 base 全局升级（battery/generator/recycler/greenhouse_dock）；smelter/assembler 及其升级/扩建数据迁入 `FACILITIES_CONFIG`。
3. **升级机制同步泛化**（用户拍板）：`upgradeShelterStatUpdate` / `getShelterUpgradeLevel` / `getUpgradeDurationSeconds` / `upgradeShelterStat`（GameContext）等入口做**配置源分派**——设施类型（`isFacility`）读 `FACILITIES_CONFIG[type].levels`，base 类型读 `SHELTER_UPGRADES`；`UpgradeStatType` 的设施部分 = `FacilityType`（自动扩展）。新增设备的升级/扩建自动可用。
4. **UI 泛化**：`FacilityCard` 的 `SmelterCard`/`AssemblerCard` 硬编码导出改为按 `FACILITIES_CONFIG` 遍历渲染；`ShelterTab` 基建 tab 的 `FacilityUpgradeSection` 同样遍历；`GameIcon` upgrade 注册表查 `FACILITIES_CONFIG[id]?.icon ?? SHELTER_UPGRADES[id]?.icon`。
5. **新增设备改动清单**（一次性基础设施改造完成后，仅两处）：
   - `FACILITIES_CONFIG` 加一条（名称/图标/升级/扩建）
   - `AUTO_RECIPES` 加配方（`facilityId`）
   - 其余自动生效：`FacilityType` 联合类型、产线/基建 UI 渲染、驻守加成作用域（`DutyScope.facilityType`）、`normalizeFacilities`（遍历配置表 key，未知类型丢弃）、`INITIAL_STATE` 按配置表驱动生成。
6. **存档兼容**：`normalizeFacilities` 改为遍历 `FACILITIES_CONFIG` 的 key；旧存档仅含 smelter/assembler，不受影响；未知设备类型（未来配置删除的）丢弃。
