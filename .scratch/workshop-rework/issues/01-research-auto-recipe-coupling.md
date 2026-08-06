# 调研手动/自动配方耦合

Type: research
Status: resolved
Blocked by:

## Question

手动配方（`src/data/recipes.ts` → `RECIPES_CONFIG`）与设施自动配方（`src/data/autoRecipes.ts` → `AUTO_RECIPES`）之间存在多少重复？两者各自被哪些代码消费？将两者统一为单一配方数据模型的可行性与影响面是什么？

调研要点：

1. **重复清单**：逐项对比两表的配方（name / cost / reward 近似或完全一致者，如"弹簧零件锻造""纳米修复泥调配""以太合金熔炼""等离子弧能组装""高级罐头封装""压缩口粮""能量补充剂""防御炮塔"等），列出重复项与仅在单侧存在的项。
2. **消费点清单**：`Recipe` 类型、`AUTO_RECIPES` 类型（`AutoRecipe`）各自被哪些文件/状态/组件引用（如 `GameContext`、`FacilityCard`、`ShelterTab`、`state/idle.ts`、`state/offline.ts` 等），列出文件与用途。
3. **统一方案取舍**：共享一份配方定义（如统一 `Recipe` + 可选 `facilityId`/`duration` 字段区分手动/自动）的技术可行性与影响面；两类型字段差异（`AutoRecipe` 有 `duration`/`facilityId`，`Recipe` 有 `special`/`blueprintId`/`capsuleTarget`）如何融合。
4. **结论**：给出"能否统一 / 建议怎么统一 / 风险点"的事实结论，供后续决策（是否纳入本次 spec 的数据单一真相源范围）。

产出：事实调研报告（含 file:line 引用），结论可被 ticket 03（批量合成语义）与 spec 汇编直接引用。

## Answer

（2026-08-06 由 /research subagent 解析，报告要点如下）

**重复清单**：8 对重复/近似配方——5 对数值完全一致（弹簧零件锻造、纳米修复泥调配、等离子弧能核心组装、高级生存罐头、能量补充剂）；3 对近似且数值存在**刻意差异**（以太合金熔炼 手动3/自动4 aether_pulp、防御炮塔 手动4/自动3 glow_fiber、防化口粮包 手动含1 aether_pulp 自动不含），差异方向不一致。仅自动侧 3 个（smelt_alloy/smelt_sunflower/craft_crystal_silicon），仅手动侧 19 个（含特殊配方与全部装备配方）。

**消费点**：RECIPES_CONFIG → `state/workshop.ts`(craftItemUpdate)、`WorkshopTab.tsx`、`state/equipment.test.ts`；AUTO_RECIPES → `state/facility.ts`(duration/input/output/facilityId)、`FacilityCard.tsx`、`state/tick.ts`/`offline.ts`(仅 name 写日志)、`state/persistence.ts`(存档防呆校验)。GameContext 通过封装函数间接消费，不直接 import。

**字段差异**：`cost↔input`、`reward↔output` 语义一一对应；Recipe 独有 `description/special/capsuleTarget/capsuleAmount/blueprintId`，AutoRecipe 独有 `duration/facilityId`。

**统一可行性**：技术完全可行。推荐以 Recipe 为基础补可选 `facilityId?/duration?`、统一字段名为 `cost/reward`。主要改动面：类型定义两处、两表合并去重、facility.ts/FacilityCard.tsx 的 input/output 字段迁移、测试中 recipe id 必须稳定。

**风险点**：① 3 对近似配方数值漂移会改变单侧经济平衡；② 存档/队列兼容——persistence.ts:124-127 依赖 `AUTO_RECIPES[id]` 存在性与 facilityId 匹配，旧 id 变更会静默丢弃旧队列；③ 手动侧 description/special 渲染分支（WorkshopTab.tsx:254-278）与自动侧无此字段，统一后需各自兼容；④ 特殊配方天然只属手动侧。

→ 已据此创建新 ticket《配方去重与统一数据模型决策》（05），并更新地图。

