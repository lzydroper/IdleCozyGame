# 06 — 召唤物边界

**Type:** grilling
**Status:** resolved

## Question

召唤物如何与 Entity 工厂衔接？id 分配与事件来源归谁？

## Answer

- Entity effort 提供 `createEntityFromConfig(configRef, { side, id })` 工厂。
- 召唤效果改为引用配置（EntityConfigRef），不再直接塞 BattleUnitSnapshot。
- id 唯一分配与 `summon` 事件 sourceId 修正不抢 Effect/Turn 的职责，作为后续交接项（After/Effect#3、After/Turn#6）。
