# 01 引擎拆分与 setup 删除

Status: resolved

## 内容

决策依据：combat-aftermath 05 号票 M3，已写回 combat-turn spec Further Notes。

1. `runTurnEngine` 拆分：新增 `createTurnRuntime(units, config): TurnEngine`（TurnEngine = TurnRuntime + `run(): TurnResult`，单发语义）；`runTurnEngine` 保留为兼容薄壳 `createTurnRuntime(units, config).run()`。
2. `TurnConfig.setup` seam 删除：装配在 run() 前经 runtime 直接完成。
3. 生产装配前移：combat.ts createBattle 改为「createTurnRuntime → 构建 BattleContext → applyPassiveAbilities → abilityRuntime.setup → run」。
4. 测试迁移六处：turnEngine.test ×3、buffRuntime.test、combat.test、abilityResource.test——setup 回调改为对 createTurnRuntime 返回的 engine 直接注册。

## 验收

- TurnConfig 无 setup 字段；全量单测通过；maxRounds=0 语义不变（context 可构建、run 返回 draw）
