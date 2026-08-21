# 02 — Ability 配置注册表与运行时实例形状

Type: grilling
Status: resolved
Blocked by: 01

## Question

Ability 的静态配置与进入战斗后的运行时实例如何分层，字段形状如何定？

1. 是否新建 `src/data/abilities.ts` 作为唯一配置源（JSON 友好），并把「普通攻击 + 觉醒技能」迁入？
2. 静态 `AbilityConfig` 需要哪些字段（`id/name/description/activation/targeting/cost/cooldown/priority/formula/effects/passive` 等）？
3. 运行时 `BattleUnitAbility`（替换 Turn 现有 index-signature 袋子）是否携带解析后的自包含字段，Turn 不 import 数据层？
4. `BattleUnitSnapshot.abilities` / `BattleUnitRuntime.abilities` 与 `BattleUnitAbility` 的拷贝、序列化、事件流展示如何约定？

产出：`AbilityConfig` 与 `BattleUnitAbility` 的类型级契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 配置源**：新建 `src/data/abilities.ts` 作为唯一配置源（JSON 友好），`basic_attack` 与现有觉醒技能迁入。
- **D2 AbilityConfig 字段**：`{ id, name, description, activation: 'active' | 'passive', targeting?, cost?, cooldown?, priority?, formula?, effects?, passive? }`。
- **D3 运行时实例**：`BattleUnitAbility` = 由 `AbilityConfig` 解析出的自包含实例：`{ abilityId, name, description, activation, targeting, cost, cooldown, priority, formula, effects, passive? }`；Turn 只拿解析后字段，不 import 数据层。
- **D4 快照与展示**：`BattleUnitSnapshot.abilities` / `BattleUnitRuntime.abilities` 浅拷贝解析后的实例；事件流只携带 `abilityId`/展示名，不做运行时查表。
