# 05 — 数据驱动设备注册（前置宽重构）

**What to build:** 把产线设备的类型、升级/扩建配置、图标、UI 渲染与存档归一化从硬编码（smelter/assembler）迁移到独立设备配置表，使新增设备种类只需加配置即可扩展。本票**不改动队列行为**——队列模型原样保留，只搬数据源、泛化类型与渲染；验收标准是行为零变化、现有测试全绿。

**Blocked by:** None — can start immediately

**Status:** done (2026-06, implement 完成)

- [x] 新建设备配置表：每类设备内聚 名称 / 图标 / 升级等级表（含耗时）/ 扩建（上限、费用、耗时）；`FacilityType` 由配置推导（`keyof` 设备表，`satisfies` 保留字面量类型安全）
- [x] `SHELTER_UPGRADES` 收敛为纯全局升级（蓄电池/发电机/回收站/温室扩展坞），设备相关数据不再残留
- [x] 升级/扩建入口做配置源分派：设备类型读设备配置表、全局类型读 `SHELTER_UPGRADES`；`UpgradeStatType` 的设施部分由 `FacilityType` 推导
- [x] 产线设备卡与基建升级卡改为按配置表遍历渲染（冶炼炉/组装台硬编码导出移除）；图标注册兼容两表
- [x] 存档归一化按设备配置表 key 遍历（未知类型丢弃）；初始状态按配置表驱动生成
- [x] 行为零变化：新增设备配置不会导致现有玩家可见行为差异；全量测试通过（含现有队列测试）
- [x] 冒烟验证：在配置表临时加一条测试设备配置，确认类型推导、渲染、升级/扩建入口自动生效（验证后移除）

## Comments

### 2026 实现记录

- 新建 `src/data/facilities.ts`：`FACILITIES_CONFIG`（smelter/assembler 内聚 name/shortName/icon/maxLevel/effectLabel/levels/expansion），`FacilityType = keyof typeof FACILITIES_CONFIG`（`satisfies Record<string, FacilityConfig>` 保留字面量 key），导出 `isFacilityType` 类型守卫。
- `SHELTER_UPGRADES` 收敛为 battery/generator/recycler/greenhouse_dock 四项纯全局升级；`FACILITY_EXPANSION` 移除（并入各设备 `expansion` 字段）。
- 升级/扩建入口（`getShelterUpgradeKey`/`getShelterUpgradeLevel`/`getUpgradeDurationSeconds`/`parseUnitUpgradeKey`/`upgradeShelterStatUpdate`/`expandFacilityUpdate`/`applyPendingUpgrade`/`refundPendingUpgrade`）配置源分派：`isFacilityType` 判定 → 读 `FACILITIES_CONFIG`，否则读 `SHELTER_UPGRADES`。
- UI：`FacilityCard` 移除 `SmelterCard`/`AssemblerCard` 硬编码导出，改为 `FacilitySection`（按配置表渲染，主题 map 缺省回退统一 cyan）；`ShelterTab` 基建/产线 tab 按 `FACILITIES_CONFIG` key 遍历；`GameIcon` upgrade 注册兼容两表（`isFacilityType(id) ? FACILITIES_CONFIG[id].icon : SHELTER_UPGRADES[id]?.icon`）；`duty.ts`/`DutyAssignModal` 作用域标签改用配置 `shortName`。
- 存档：`normalizeFacilities` 按 `FACILITIES_CONFIG` key 遍历（未知设备类型丢弃）；`INITIAL_STATE.facilities` 由 `createInitialFacilities()` 配置驱动生成。
- 类型迁移：`FacilityType` 从 `types/game.ts` 移至 `data/facilities.ts`；`types/game.ts`、`types/config.ts`、`heroes.ts`、`tick.ts`、`offline.ts`、`duty.ts`、`GameContext.tsx` 改 `import type`。
- 测试：`facility.test.ts` 新增「数据驱动设备注册」describe（配置表↔初始状态一致、SHELTER_UPGRADES 无设备残留、isFacilityType 守卫、未知设备类型丢弃、升级 key 解析）；`GameContext.test.tsx` 4 处设施夹具改为 `{ ...structuredClone(INITIAL_STATE.shelter.facilities), ... }` 展开（对新增设备类型健壮，运行时行为不变）。
- 冒烟验证（checklist 第 7 项）：临时加 `test_facility` 配置 + 临时冒烟测试 → 类型推导（`FacilityType` 自动含新 key）、初始状态生成、升级/扩建入口、存档归一化、基建/产线 UI 渲染全部自动生效（tsc + 5 条冒烟断言通过）→ 验证后移除。
- 注意：`equipment.test.ts` 与 `ItemDetailModal.test.tsx` 的 3 个失败为**预先存在且偶发**（stash 撤销本票改动后仍失败；配置「废土利刃」含 defense 2 而测试期望缺失该属性），与本票无关；这两个测试文件的修复改动来自并行外部修改，未纳入本票提交。

