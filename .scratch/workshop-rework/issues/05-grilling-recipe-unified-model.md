# 配方去重与统一数据模型决策

Type: grilling
Status: resolved
Blocked by:

## Question

基于 ticket 01（调研手动/自动配方耦合）的结论，决定如何落地"配方数据单一真相源"（用户需求第 3/5 点，并决定 01 调研揭示的 8 对重复配方去留）。

需要决议：

1. **统一模型**：以 Recipe 为基础补 `facilityId?`/`duration?`，统一字段名为 `cost/reward`（迁移 `input/output`），合并两张配置表或共享同一基础类型——确认此方案或提出替代。
2. **8 对重复配方去重**：
   - 5 对数值完全一致 → 直接合并为一条（保留哪个 id、名称取哪侧）？
   - 3 对近似且数值有刻意差异（以太合金 3/4、炮塔 4/3、口粮含/不含 aether_pulp）→ 合并取哪侧数值？是否允许同一配方同时服务手动与自动但保留双数值（如 `costManual`/`costAuto` 或按 facilityId 区分）？还是统一到一处并接受经济平衡调整？
3. **手动侧独有字段**：`description/special/blueprintId` 在自动侧留空（可选字段），确认无冲突。
4. **兼容硬约束**：旧配方 id 保持稳定、`persistence.ts` 的 `facilityId` 防呆校验保留（01 风险点 ②），确认纳入 spec。

前置：先读 ticket 01 的 Answer（已解析）。本决议影响 ticket 03（批量合成语义）与最终 spec 的数据模型章节。**分类字段方案**（`category?: ItemCategory | 'building'`，默认从 reward 主产物推导）见 ticket 02 的 Answer，统一模型时一并纳入。

产出：配方数据模型与去重决议，写入 spec 的数据模型章节。

## Answer

（2026-08-06 与用户 grilling 决议）

**1. 统一模型**：共享基础类型 `Recipe`，`AutoRecipe`（game.ts:198-205）删除、并入该类型。字段：`id`、`cost`、`reward`、`special?`、`capsuleTarget?`、`capsuleAmount?`、`blueprintId?`、`facilityId?`、`duration?`、`category?`（02 决议：`ItemCategory | 'building'`，默认从 reward 主产物推导）、`displayName?`（无 reward 配方兜底）。**删除 `name`/`description`**。字段名统一 `cost/reward`（`input/output` 迁移，波及 facility.ts / FacilityCard.tsx）。

**2. 配方文案完全推导**：显示名 = 「合成 {reward 主产物名} ×N」；描述 = 主产物 `ITEMS_CONFIG.description`。无 reward 配方兜底：`sanity_capsule`（capsule_charge）用 `capsuleTarget` 产物名「稳定胶囊」，`greenhouse_expansion` 显式 `displayName`「温室智能扩展坞」。

**3. 去重策略**（用户自定义）：
- **5 对数值完全一致 → 仅保留工坊（手动）侧条目**，删除自动侧重复：`craft_rusted_spring`、`craft_nanite_slurry`、`craft_plasma_arc`、`craft_ration_deluxe`、`assemble_energy`；
- **3 对刻意数值差 → 双条目双数值保留**（aether_ingot 3/4、turret 4/3、ration 含/不含 aether_pulp）。

**4. 兼容硬约束**：被删自动 id 在 `persistence.ts` 存档校验处做**一次性 id 迁移映射**（如 `craft_rusted_spring → rusted_spring_craft`），旧队列条目经映射后保留，不再引用的 id 过滤；`facilityId` 防呆校验保留。

**5. 配置表组织**：双文件共享类型——`src/data/recipes.ts`（手动侧全部）与 `src/data/autoRecipes.ts`（仅剩 3 对近似的自动侧 + 3 个仅自动侧条目），基础类型定义收敛到一处（建议 `src/types/config.ts` 或 recipes.ts 导出，spec 定稿）。

→ 所有决策 ticket 已解析，路线清晰；已创建 ticket 06 汇编 spec。

