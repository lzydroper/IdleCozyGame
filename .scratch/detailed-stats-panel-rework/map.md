# Detailed Stats Panel Rework

## Destination

英雄详情 -> 详细属性面板（`DetailedStatsModal`）从三块分类卡片改为：不分大类，21 项可修饰属性 + 派生属性依次平铺罗列，每条属性可展开查看 Modifier 来源分解，默认全部折叠，不写属性介绍文字。保持现有暗色 zinc 风格。

## Notes

- 部分统一方案：里程碑加成转 StatModifier（走统一管道）；职阶每级成长和元属性固有值保持现有计算方式（非 modifier）
- StatModifier 加可选 `source?: string` 字段记录来源（stat-bonus-unification spec 已预留此方案）
- 派生属性（减伤率/免暴击率/冷却缩减/伤害豁免）保留展示，可展开查看元属性贡献列表
- 面板需补齐天赋/觉醒/羁绊 modifier 接入（当前断层，只有装备 flat 值接入）
- 4 个产出函数位置：`src/state/equipment.ts`、`src/state/talents.ts`、`src/state/awakening.ts`、`src/state/bonds.ts`
- 里程碑手动拆分重复代码在两处：`src/state/combat.ts:243-269` 和 `src/components/HeroDetailModal.tsx:91-127`
- 参考视觉风格：暖色木质休闲风（仅作布局参考，不改配色）

## Decisions so far

- [01 - StatModifier source 字段 + 分组聚合](issues/01-statmodifier-source-field-and-grouped-aggregation.md) - StatModifier 加可选 source?: string；新增 aggregateModifiersBySource 按来源分组 + getStatSourcesByStat 提取单属性来源贡献；8 个新测试全绿；现有 aggregateModifiers/calculateEntityStats 不受影响
- [02 - 派生属性贡献计算](issues/02-derived-stat-contribution-calculation.md) - 新增 getDerivedStatContributions 追溯 6 个派生属性来源（critResist<-敏捷、damageReduction<-防御公式、durationReduction/effectReduction<-意志、cooldownReduction<-超越、voidSpirit<-固有值）；coefficient 可选（非线性公式不设）；守卫用 !==0 处理负值；10 个新测试全绿
- [03 - 四来源产出函数打 source 标签](issues/03-four-source-functions-tag-source.md) - 装备/天赋/觉醒/羁绊四来源全部打 source 标签；getEquippedFlatStats 不再预合并同属性 modifier（保留各装备独立 source）；17 处测试断言更新；战斗数值无回归（aggregateModifiers 忽略 source）；review 标记 HeroDetailModal flatOf 隐性契约留待 05 号修复

## Not yet specified

<!-- 无 - 所有决策已明确，路径清晰 -->

## Out of scope

<!-- 无 -->
