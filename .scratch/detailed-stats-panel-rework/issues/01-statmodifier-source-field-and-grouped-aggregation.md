# 01 - StatModifier 加 source 字段 + 按来源分组聚合

**What to build:** 扩展 StatModifier 接口，新增可选 `source?: string` 字段用于记录每条修饰符的来源名称（如"废土利刃"、"钢铁壁垒"、"觉醒·诺娃"、"Lv10里程碑"）。同时新增一个按来源分组的聚合函数 `aggregateModifiersBySource`，它保留每条 modifier 的 source 信息并按来源分组返回，供 UI 展开时展示来源分解。现有 `aggregateModifiers`（丢弃 source 直接求和）和 `calculateEntityStats` 不受影响，继续走原有逻辑。

**Blocked by:** None - can start immediately

**Status:** resolved

- [ ] `StatModifier` 接口新增可选字段 `source?: string`（`src/state/statSystem.ts`）
- [ ] 新增 `aggregateModifiersBySource` 函数：输入 `StatModifier[]`，返回按 source 分组的结果（每个来源下按 stat 再聚合 flat/percent），供 UI 展开时展示"某属性来自哪些来源、各贡献多少"
- [ ] 新增对应的类型定义（如 `SourceGroupedModifiers`）
- [ ] 现有 `aggregateModifiers` 和 `calculateEntityStats` 行为不变，不破坏现有测试
- [ ] 新增 `aggregateModifiersBySource` 的单元测试
