# 03 召唤落地 seam

Type: task
Status: resolved

## 内容

A#6：战斗中召唤的单位补齐两件落地注册——turnEnd 冷却 tick、被动编译与挂载（含其被动配置的运行时注册）。

## Answer（实施记录）

- abilityRuntime.setup 注册常驻 'summon' 订阅：新单位 → 注册 turnEnd 冷却 tick + `registerBuffConfigs(collectPassiveBuffConfigs(unit.abilities, resolveStats))` + `applyPassiveAbilities(ctx, [unit])`。
- BattleContext 新增 `registerBuffConfigs(configs)` 运行时配置追加。
- 集成测试（combat.test）：召唤携带被动能力的单位 → `passive:lifesteal_test` Buff 即时挂载 ✓。
