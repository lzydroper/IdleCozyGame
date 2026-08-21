# 04 — createBattle 装配工厂

**What to build:** 把建战斗上下文、注册 Ability/Buff/被动、跑引擎的装配逻辑收敛为 createBattle 工厂；调用方只需提供实体列表并 run，simulateBattle 成为薄壳。

**Blocked by:** 03 — 运行时 BattleEntity 与唯一转换缝

**Status:** resolved

- [x] `createBattle(entities, options)` 返回 `{ run, context }`，options 含 maxRounds 与 rng。
- [x] Ability 运行时、被动、Buff 触发器注册与初始化全部在 createBattle 装配层完成，不再散落在 Turn 配置 setup 里。
- [x] `simulateBattle` 改为薄壳：装配实体 → `createBattle(...).run()`，不再包含装配细节。
- [x] 五条战斗入口（自动/探索/BOSS/挂机/梦魇）复用 createBattle，行为与既有测试一致。
- [x] After/Turn#11、#12 的前提条件满足（最终勾除在 06）。
