# 03 — 运行时 BattleEntity 与唯一转换缝

**What to build:** 所有参战单位（英雄/敌人/梦魇/召唤物）在进战斗时统一转换为 BattleEntity；任何实体进入 Turn 只经过唯一转换缝，旧 CombatantState 双轨删除。

**Blocked by:** 01 — 配置层统一；02 — Turn side 改名与共享战斗类型抽离

**Status:** resolved

- [x] `BattleEntity` / `EntityRecipe` 类型落地，字段与 map 04 一致：id/name/kind/role?/side/faction/recipe/hp/mp/abilities(ResolvedAbility[])/initiative。
- [x] `toTurnUnit(entity)` 是 Entity → `BattleUnitSnapshot` 的唯一转换点，`statParams` 由 recipe 生成。
- [x] 英雄转换产出 BattleEntity，天赋/羁绊/装备/里程碑在转换时结算为 abilities + permanentModifiers + 三层属性；`collectHeroAbilities` 返回 `ResolvedAbility[]`。
- [x] 敌人与梦魇走同一实体工厂；战斗内重算改为对 BattleEntity 的 recipe 重算。
- [x] 删除 `CombatantState` / `CombatantSnapshot` 及所有双轨转换，不留 alias；相关旧测试删除或按新语义重写。
- [x] 自动战斗、探索遭遇、BOSS、挂机、梦魇防御五条战斗路径端到端通过。
