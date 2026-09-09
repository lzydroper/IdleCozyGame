# 12 — 敌人能力入口

Type: grilling
Status: resolved
Blocked by: 02

## Question

Ability 模型是否 faction 无关，并为敌人留入口？

1. `AbilityConfig` / `BattleUnitAbility` 是否不区分 hero/enemy？
2. `CombatEnemyConfig` 未来是否可加 `abilities`（或 `abilityIds`），普通怪/BOSS 统一走同一 Ability 模型？
3. 本次是否只定模型入口，不迁移任何敌人配置、不设计敌人技能内容？

产出：敌人能力入口约定（模型级）。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 faction 无关**：`AbilityConfig` / `BattleUnitAbility` 不区分 hero/enemy。
- **D2 敌人入口**：`CombatEnemyConfig` 未来可加 `abilities`（或 `abilityIds`），普通怪/BOSS 统一走同一 Ability 模型。
- **D3 本次范围**：只定模型入口，不迁移任何敌人配置、不设计敌人技能内容。
