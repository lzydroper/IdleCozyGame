# 01 — 配置层统一：EntityConfigBase + HeroConfig/EnemyConfig + enemies.ts

**What to build:** 统一所有参战实体的配置表达：英雄、普通敌人、BOSS、梦魇都通过同一套 EntityConfigBase 描述；英雄配置改用 description；敌人配置集中到统一敌人注册表，战斗区域只引用敌人 id。玩家可见的战斗行为不变。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `EntityKind = 'hero' | 'enemy' | 'other'`、`EnemyRole = 'normal' | 'boss' | 'nightmare'`、`AbilityRef = { abilityId, overrides? }` 定义完成，公共字段与 map 02 一致。
- [x] `EntityConfigBase` / `HeroConfig` / `EnemyConfig` / `OtherConfig` 建立组合式继承；`HeroConfig` 收窄 `kind:'hero'` 并保留 heroClass/levelMilestones/dutyMeta；`EnemyConfig` 收窄 `kind:'enemy'` 并带 role。
- [x] 英雄 `backstory` 全部改名为 `description`，所有展示与测试消费方同步。
- [x] 敌人/BOSS/梦魇配置迁入统一敌人注册表；战斗区域与探索事件改为引用敌人 id，BOSS 经济字段仍留在区域配置。
- [x] 梦魇泄露体表达为 `EnemyConfig`（`kind:'enemy'`、`role:'nightmare'`）。
- [x] 敌人强制声明六阵营之一；迁移中缺失的阵营补齐为明确值。
- [x] 既有英雄/敌人生成、详情展示、战斗入口测试全绿，行为等价。
