# Effect 模块 — 现状留档与“将就”待完善项

> 本文记录 combat-effect 实现后的**已知妥协点与未闭环项**，供后续 Buff / Ability / 数值平衡 effort 优先补齐。
> 实现基线：`a812838` + `cc4629a`。设计决策见 `.scratch/combat-effect/spec.md` 与 `docs/combat/Effect.md`。

## 已落地（简短）

- `TurnConfig.setup` 初始化钩子。
- 统一 `Modifier`（`stat.*` / `effect.*`）+ `StatModifier` 适配器。
- `BattleContext`：TurnRuntime + Modifier/Buff/Flag 占位状态。
- `resolveEffect` 三阶段：before 修正+审核、during 分派 executor、after 派发 `effectApplied`。
- 10 个基础 EffectKind executor：damage / heal / statModify / stun / dispel / immunityElement / immunityBuff / taunt / summon / applyBuff。
- 伤害公式收敛到 `effectSystem.calculateDamageAmount`；旧 `combatEngine.ts` 已删除。

## 待完善项（按风险排序）

### 1. Buff 模块尚未接管——BattleContext 的 Buff 是占位实现

当前 `battleContext.ts` 的 `applyBuff` 只是「同 buffId 已存在则返回原实例，否则追加」，**没有实现 Buff.md 的 Renew / Stack / 触发注册**：

- 重复施加同一 buff 不刷新 duration、不叠加 stacks，也不按配置决定是否刷新/堆叠。
- `BuffInstance.duration` 为 `null` 表示永久，但没有「回合结束递减 / 归零移除」的运行时。
- buff 的触发时机注册、触发后派发 Effect，完全未接；目前 `stun` 落地后没有任何东西在 `turnStart` 让它跳过行动。
- 旧 `src/state/buffSystem.ts`（`ActiveBuff` + `collectBuffModifiers` + `tickBuffs`）仍是生产链路在用的另一套 buff，与新 `BuffInstance` **并存未统一**。

→ 后续 Buff effort 必须：实现 Renew/Stack、duration 递减与到期移除、时机订阅与触发、canAct 汇总，并把生产 `heroToCombatant/recomputeCombatant` 切换到新 Buff。

### 2. statModify 的“移除”依赖调用方自律

`statModify` executor 只负责 `ctx.addModifier`，通过 `EffectResult.modifierId` 把句柄交还调用方。移除（`ctx.removeModifier`）目前**没有自动触发点**，也不存在“持续 N 回合后自动移除”的机制——这同样要等 Buff 包装层。

- 当前测试只证明“拿到句柄后能手动移除”，未证明生产链路会正确持有并到期移除。
- `effect.duration` 对 statModify 无效（按 05 收口），因此临时属性增减必须由 Buff 承载。

### 3. summon 的 targetId 是“首个召唤物 id”，有覆盖风险

`summon` 是多目标例外：`EffectInstance.targetId` 被当作**首个召唤物的 id**，后续单位用 `targetId-N` 生成。

- 真实 `TurnRuntime.summonUnit` 会 `unitMap.set(unit.id, unit)`，若调用方传入的 `targetId` 与已有单位重复，会**静默覆盖**。
- 目前没有防重名/自动分配 id 的机制，调用方必须自己保证 id 唯一。
- 建议后续给 summon executor 增加「从运行时分配唯一 id」的接口，或在进入 before 前校验 id 不存在。

### 4. 控制/免疫类效果的 duration 完全悬空

`stun` 落地成 `buffId: 'stun'` 的占位 Buff；`immunityElement / immunityBuff / taunt` 只写 BattleFlag。这些效果**没有 duration 递减、没有到期清除**：

- `stun` 的 duration 即使被意志减免到 `<= 0`，当前也会照常挂上占位 Buff（Buff.md 要求归零即移除）。
- 免疫/嘲讽 flag 一旦设置就永久存在，没有 `removeFlag` 语义。
- 后续应由 Buff 包装：进入时 setFlag，到期时 clearFlag。

### 5. BattleFlag 与 EffectParamKey 仍是字符串魔法值

- `BattleFlag = string`，实际使用 `immunityElement:<element>`、`immunityBuff:<buffKind>`、`'taunt'` 这类拼接键。
- `EffectParamKey = string`，`effect.*` 目标键目前靠约定，没有编译期约束。

→ 后续可收敛为结构化 union / 判别类型，减少拼写错误与 `startsWith` 解析。

### 6. EffectKind 三处 switch 未统一

同一 `EffectKind` 在以下三处各自 switch/分派：

- `effectSystem.ts` 的 `applyBefore`
- `effectSystem.ts` 的 `executeDuring`
- `battleEventPresentation.ts` 的 `effectApplied` presenter

新增一个 EffectKind 需要改三处，容易漏。建议后续改为「每 kind 一个 executor 对象（含 before/during/present）」，或至少共享一张 kind→元数据 表。

### 7. 测试 fixture 与面板展开存在重复

- `battleContext.test.ts` 与 `effectSystem.test.ts` 各自造了一套 fake runtime / 单位 fixture。
- `combat.ts` 的 `combatantStats` 在「有快照 / 无快照」两个分支枚举约 20 个属性键。

→ 建议抽共享 test factory 与 `BattleUnitStats` 展平函数（可从 `CalculatedEntityStats` 一次性生成）。

### 8. 少量未消费的通用接口

以下接口当前没有生产调用方，属于为将来留的口子，先“将就”保留：

- `modifier.ts` 的 `isEffectTarget`、`filterModifiersByNamespace`（后者仅测试使用）。
- `battleContext.ts` 的 `BattleContextInitialState`（生产未用）。
- `BattleContext.rng` 只是转发 `runtime.rng`，尚无随机效果消费。

→ 若后续 Buff/随机效果用不上，应删除或内联。

### 9. 伤害结果信息比旧 combatEngine 少

旧的 `DamageResult` 含 `isCrit` / `isExempted` / `damageMitigated`；新 `calculateDamageAmount` 只返回最终数字。当前生产未消费这些字段，所以不影响功能，但若战斗详情面板要展示「暴击 / 豁免 / 减免」，需要重新把这些结果带出来。

### 10. 平铺扩展成本

基础效果种类采用固定 `EffectKind` union + 内置 executor，扩展新效果必须改代码。这是本次明确决策（不做注册表），但应意识到：后续内容量上来后，需要重新评估是否引入数据驱动的效果注册表。

## 建议补齐顺序

1. Buff 模块接管（#1、#2、#4 一起解决）。
2. summon id 分配防覆盖（#3）。
3. 类型收紧：BattleFlag / EffectParamKey（#5）。
4. executor 分派收敛 + fixture 去重（#6、#7）。
5. 未消费接口清理 + 伤害结果信息（#8、#9）。
