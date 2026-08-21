# Ability 模块「将就」清单

> 记录范围：combat-ability 实现票 01–09 完成后的已知取舍与待补强项。
> 实现提交：a9d56b5（Implement combat ability layer）。
> 语义：本文件只记录「能跑通、但为了先落地而做出的妥协」，不是 bug 清单；已通过的测试与构建不代表这些点不需要后续打磨。

## 1. 类型层仍是「半强类型」

- **现状**：`turnEngine.BattleUnitAbility` 仍是 `{ id; name?; [key: string]: unknown }`，`ResolvedAbility` 放入 `abilities` 时通过 `as unknown as BattleUnitAbility` 强转（`src/state/combat.ts`、`src/state/abilityRuntime.ts`、`src/state/abilityPassive.ts`）。
- **待完善**：把 `BattleUnitAbility` 收敛为 `ResolvedAbility`（或等价的强类型），移除 unsafe cast，让配置层/运行时层字段错误在编译期暴露。

## 2. EffectTemplate 参数是宽 `Record<string, unknown>`

- **现状**：`abilityTypes.EffectTemplate.params` 是宽泛对象，`abilityCompiler` 内部做 cast；配置写错字段不会在编译期报错。
- **待完善**：按 `EffectKind` 做 discriminated union，每个 kind 明确 params 形状，并提供配置校验函数。

## 3. 资源系统目前只支持 mp

- **现状**：`canAfford` / `spendCost` 只认 `cost.resource === 'mp'`，非 mp 直接返回 false；没有资源回复、最大值成长、资源 UI 展示。
- **待完善**：建立 `ResourceKey` 联合类型，按资源分发的 spend 管线；MP 回复与展示接入战斗 UI。

## 4. 战斗内面板重算无缓存

- **现状**：`BattleContext.resolveStats` 每次调用都现算，且 `unit.stats` 仍是入场静态快照；动态 Modifier 不会回写静态快照。
- **待完善**：明确 `unit.stats` 只作展示/兜底，必要时给 `resolveStats` 加缓存/失效；或提供面板变化事件。

## 5. 冷却实现有补偿量

- **现状**：为匹配旧语义「用后 3 回合普通攻击再发动」，内部写 `cooldownSet + 1`（`src/state/abilityRuntime.ts`），事件上报的是 `cooldownSet`。
- **待完善**：把「施放回合不计入已过回合」提炼成显式模型，而不是 +1 补偿；同时补上召唤物的冷却 tick。

## 6. 召唤物冷却与被动不完整

- **现状**：`abilityRuntime.setup` 只为开场存活单位注册 turnEnd 冷却 tick；`applyPassiveAbilities` 也只在 setup 时对开场单位执行。战斗中 `summonUnit` 入场的单位不会注册冷却，也不会编译被动。
- **待完善**：在召唤落地 seam 补注册冷却与被动编译。

## 7. 被动计算读静态 stats

- **现状**：`src/state/abilityPassive.ts` 的 `createEffects` 使用 `source.stats`，不经过 `resolveStats`，战斗内属性增益/减益不会影响被动数值。
- **待完善**：被动编译/触发时持有 `BattleContext` 或改调 `resolveStats`。

## 8. 事件与展示仍是双轨

- **现状**：`abilityUsed` 是主事件；`attackAfter` 仍带旧 `kind: 'attack' | 'skill'` 数据以兼容旧测试/展示。AOE 的 `abilityUsed` presenter 列出目标 id，`attackAfter` 仍每目标一条。
- **待完善**：逐步把展示与测试迁移到 `abilityUsed` + `effectApplied`，`attackAfter` 只保留给「攻击后」触发类 Buff。

## 9. 觉醒技能已切到 abilityId，但装配仍是 id 数组

- **现状**：`AwakenConfig.abilityId`、`collectHeroAbilities` 返回 `string[]`；`CombatantState.abilities` 也是 `string[]`。英雄/敌人装配最终仍在 `combatantToTurnUnit` 里查注册表。
- **待完善**：让 `collectHeroAbilities` 直接返回 `ResolvedAbility[]`，把查表/解析收敛到装配层，`Turn` 只拿解析后实例。

## 10. 敌人能力入口空转

- **现状**：`CombatEnemyConfig.abilities?: string[]` 已接好，但没有任何敌人/BOSS 配置实际填写能力。
- **待完善**：为 BOSS/特殊敌人配置 Ability 内容。

## 11. 数值/公式取整策略分散

- **现状**：`resolveStats` 对核心四维 `attack/defense/maxHp/maxMp` 取整，`abilityCompiler.asNumber` 又统一 `Math.round`，且与 `combatantStats` 的展平逻辑重复。
- **待完善**：抽 `toBattleUnitStats(calculated)` 单一路径，明确「配置公式输出 → 面板 → 效果参数」每一层取整规则。

## 12. statParams 克隆逻辑重复

- **现状**：`turnEngine.cloneSnapshotUnit` 与 `combat.combatantToTurnUnit` 都手写 `statParams` 深拷贝。
- **待完善**：抽 `cloneStatParams` / `toBattleUnitStatParams`。

## 13. fireCount 只接了攻击后

- **现状**：`attackAfter` data 已带 `fireCount`，但 `abilityUsed` 没有；非攻击触发场景尚未验证。
- **待完善**：把 `fireCount` 作为 `EffectTemplate` 的一等字段在编译/事件两层一致传播。

## 14. BattleUnitStatParams 放在 turnEngine

- **现状**：`turnEngine.ts` 为了 `BattleUnitStatParams` 引了 `statSystem` 类型，引擎与属性系统耦合。
- **待完善**：把战斗统计相关类型抽到共享模块，让 Turn 保持纯流程引擎边界。

## 建议处理顺序

1. **低风险收敛**：`BattleUnitAbility` 类型收窄、`toBattleUnitStats`、`cloneStatParams`、`ResourceKey`。
2. **行为补全**：召唤物冷却/被动、被动 resolveStats、fireCount 全链路。
3. **内容/展示迁移**：敌人能力配置、事件展示迁移到 `abilityUsed`。
