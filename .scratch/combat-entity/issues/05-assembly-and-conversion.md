# 05 — createBattle 装配工厂与唯一转换缝

**Type:** grilling
**Status:** resolved

## Question

Entity 如何进入 Turn？装配层如何收敛？

## Answer

- `toTurnUnit(entity: BattleEntity): BattleUnitSnapshot` 是唯一转换点；`BattleUnitSnapshot` 保持 Turn 输入契约。
- `statParams` 由 entity.recipe 生成，战斗中重算走 resolveStats。
- 新增 `createBattle(entities, { maxRounds?, rng? }) => { run(): BattleResult; context: BattleContext }`；把当前 simulateBattle 的装配（建单位 + Ability/Buff/被动 + 跑引擎）上移。
- `simulateBattle` 退化为薄壳：装配实体 → `createBattle(...).run()`。
- 关闭 After/Turn#11/#12。
