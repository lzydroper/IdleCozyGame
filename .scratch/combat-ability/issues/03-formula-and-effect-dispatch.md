# 03 — 公式模板与 Effect 派发

Type: grilling
Status: resolved
Blocked by: 02

## Question

Ability 如何计算来源侧最终数值，并声明它派发哪些 Effect？

1. 公式是否用固定 discriminated union（如 `{kind:'attack', multiplier}` / `{kind:'maxHp', percent}` / `{kind:'flat', value}`），而不是字符串表达式或代码函数？
2. `effects: EffectTemplate[]` 是否作为唯一派发声明；每个模板如何声明 EffectKind、参数来源（公式输出/常量）、可选 `fireCount`？
3. 多目标（AOE/群体治疗）是否由 Ability 按 targeting 拆成多个单目标 `EffectInstance`？
4. 模板派发 `applyBuff` 时，`BuffInstance` 由谁、何时、按什么字段创建？
5. `fireCount` 生产端是否写入 `timingCtx.data.fireCount`，默认 1，与 combat-buff 的消费端对齐？

产出：公式模板与 `EffectTemplate` 的配置/运行时契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 公式**：固定 discriminated union，首版含 `{ kind: 'attack', multiplier }` / `{ kind: 'maxHp', percent }` / `{ kind: 'flat', value }`；不用字符串表达式或代码函数。
- **D2 Effect 声明**：`effects: EffectTemplate[]`，模板 `{ kind, params, fireCount? }`；`params` 可引用公式输出或常量；`fireCount` 默认 1。
- **D3 多目标**：AOE/群体治疗由 Ability 按 targeting 拆成多个单目标 `EffectInstance`。
- **D4 applyBuff 模板**：由 Ability 在派发前构造 `BuffInstance`，经 `ctx.applyBuff` 落地。
- **D5 fireCount 生产端**：派发时写入 `timingCtx.data.fireCount`，与 combat-buff 消费端对齐。
