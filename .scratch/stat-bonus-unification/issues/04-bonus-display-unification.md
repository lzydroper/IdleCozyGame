# 04 — 加成展示层统一（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 01, 03

## Question

`formatBonus` / `COMBAT_BONUS_META` 退役后的加成文案与面板如何统一：

1. **文案函数形态**：新函数如何呈现 flat / percent / 多属性混合（如「攻击 +5、+10%」）？元数据表（COMBAT_BONUS_META 的替代）以什么 key 驱动？
2. **消费点清单**：羁绊面板、天赋树节点、装备弹窗、HeroDetailModal、DetailedStatsModal 等消费点哪些必改、哪些可选；统一面板/文案如何呈现修饰符（含多个来源叠加时）。
3. **来源分解**：是否需要「某属性由哪些来源贡献」的 UI 分解——与 01 的 source 字段联动（01 未定 source 时此处给出结论）。

## Answer

（HITL grilling，3 个决策点全部确认推荐方案）

- **D1 文案函数形态 = `STAT_META` + `formatModifiers`**：新增 `STAT_META: Record<StatKey, { label; percentDisplay?: boolean }>`（21 项；critRate/critDmg/9 个 Special 为 `percentDisplay: true`，值按 ×100 显示 %；Base 数值属性与 6 个 Primary 显示原值）；`formatModifiers(mods: StatModifier[]): string` 内部走 `aggregateModifiers`（02 D1 导出），同 stat 的 flat 与 percent 合并为一条（「攻击 +5、+10%」），正数加 +、负数显示 -。`formatBonus` / `COMBAT_BONUS_META` / `formatTalentEffect` 删除（talent 数据层改 StatModifier[] 后 formatTalentEffect 只是别名）。
- **D2 展示范围 = 加成文案统一 + 装备行消重**：加成类文案消费点全部切到 `formatModifiers` —— 羁绊面板（HeroTab.tsx:128 / WildernessTab.tsx:736）、天赋节点（HeroTalentPanel.tsx:315）、**装备套装/神话 percent（补上现状不展示数值的缺陷：EquipmentDetailModal 只显示 tier.description、HeroDetailModal 解构丢弃 percent）**；装备属性行（EquipmentDetailModal.renderStatRow:155-156 手写重复公式）统一数据源到装备修饰符生成逻辑，保留数值行形态；ItemDetailModal / EquipSelectorModal / HeroEquipmentPanel 单件装备属性行做类型适配、不重做。
- **D3 不做交叉来源分解**：各来源 UI 维持按来源分组展示自身贡献（羁绊面板在羁绊区、天赋节点在天赋树），面板（HeroDetailModal / DetailedStatsModal）显示最终值；**`source` 字段不加（维持 01 D1）**，交叉来源分解（「攻击 +15% = 羁绊 10% + 天赋 5%」）留作未来可选项，届时以可选字段追加。

**地图完成**：本 effort 全部 5 张 ticket 已解决，决策集完整（01 模型 / 02 管道 / 03 来源迁移 / 04 展示层 / 05 审计），可直接交给 to-tickets 生成实施蓝图。
