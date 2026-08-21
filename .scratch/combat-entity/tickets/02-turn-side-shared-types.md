# 02 — Turn side 改名与共享战斗类型抽离

**What to build:** Turn 引擎不再把参战单位的队伍归属叫 faction；战斗内归属统一为 side（hero/enemy），与六阵营 faction 解耦；战斗统计类型移到共享层，Turn 保持纯流程。

**Blocked by:** 01 — 配置层统一：EntityConfigBase + HeroConfig/EnemyConfig + enemies.ts

**Status:** resolved

- [x] `UnitSide = 'hero' | 'enemy'` 定义；`BattleUnitSnapshot` 与 `BattleUnitRuntime` 的 `faction` 字段改名 `side`，所有生产与测试消费方同步。
- [x] 六阵营语义仅保留在配置层（`EntityConfig.faction` / `HeroConfig.faction` 等）；Turn 运行时不再表达六阵营。
- [x] `BattleUnitStats` / `BattleUnitStatParams` 移到共享战斗类型模块；Turn 引擎对 statSystem 只剩类型引用。
- [x] 先机、队列、事件流、召唤等 Turn 行为测试全绿。
- [x] After/Turn#10 与 After/Ability#14 的前提条件已满足（最终勾除在 06）。
