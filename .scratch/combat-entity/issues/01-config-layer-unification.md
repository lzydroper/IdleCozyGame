# 01 — 统一配置层：EntityKind/EnemyRole 与 HeroConfig/EnemyConfig

**Type:** grilling
**Status:** resolved

## Question

配置层如何从「HeroConfig / CombatEnemyConfig / 梦魇 ad-hoc」统一为单一 Entity 配置模型，同时保持英雄与敌人的差异可表达？

## Answer

- 顶层判别只用 `EntityKind = 'hero' | 'enemy' | 'other'`；boss/nightmare 不进入顶层，避免耦合。
- 敌人侧子类型用 `EnemyRole = 'normal' | 'boss' | 'nightmare'`（字段名 `role`，默认 `normal`）。
- 英雄侧子类型继续用 `heroClass: HeroClass`。
- 类型结构：
  - `EntityConfigBase`：公共字段（id/name/description?/kind/faction/baseAttributes/primaryAttributes?/specialAttributes?/modifiers?/abilities?/sprite?/icon?）。
  - `HeroConfig extends EntityConfigBase`，`kind: 'hero'`，加 `heroClass/levelMilestones?/dutyMeta?`。
  - `EnemyConfig extends EntityConfigBase`，`kind: 'enemy'`，加 `role?`。
  - `OtherConfig extends EntityConfigBase`，`kind: 'other'`，预留。
- 敌人配置从 `src/data/combatZones.ts` 抽到 `src/data/enemies.ts`；`combatZones.ts` 只引用敌人 id。本次只做中间态，不做区域/关卡重构，完全 JSON 化留给后续。
