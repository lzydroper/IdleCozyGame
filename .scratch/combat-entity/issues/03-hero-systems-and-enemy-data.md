# 03 — 英雄专有系统边界与 enemies.ts 中间态

**Type:** grilling
**Status:** resolved

## Question

英雄专有字段（talent/bond/equipment/growth/duty）在统一配置层中如何归属？enemies.ts 迁移做到什么程度？

## Answer

- talent/bonds/equipment 继续独立注册表（按 heroId/faction 关联），`HeroConfig` 不内嵌这三个系统；Entity 配置层只统一参战实体公共形状。
- `HeroConfig` 保留 `heroClass/levelMilestones/dutyMeta`。
- 英雄专有内容在 hero→Entity 转换时结算为 abilities + permanentModifiers + 三层属性，运行时 Entity 不含英雄专有字段。
- enemies.ts 中间态：新建 `ENEMY_CONFIGS`（id → EnemyConfig）；`zone.enemies`/`zone.boss.enemies` 改为敌人 id 数组；BOSS 的 name/staminaCost/expReward/drops/soulEcho 仍留 combatZones.ts（等 Level effort）。
- 本次机械迁移 + 字段补齐；内容补全出 scope。
