# 04 订阅句柄与 Buff 注册内聚

Status: resolved

## 内容

决策依据：triage T#7 / B§2.5 / B§4.3 / B§4.5 / B§4.6。

1. `TurnRuntime.register` 返回 unsubscribe 句柄（或 registration id）；保留按 subscriber 引用注销的兼容路径（turnEngine.ts:139/301）
2. `createBuffTriggerHooks` 的模块级 WeakMap 消除：改用句柄存到 BattleContext 自身状态或实例字段（buffRuntime.ts:18/104-113），跨上下文内聚
3. `executeStun` 构造 BuffInstance 时 values 承载传入数值/元数据（effectSystem.ts，现恒 `{}`）
4. `removeBuff` 清理 owned Modifier 范围扩大：扫描全部单位而非仅 targetId（battleContext removeBuff / removeModifiersBySource 链路）
5. owned Modifier source 标记统一 helper（`buffModifierSource(instance)` 一类），消除散落的 `instance.id` 约定

## 验收

- buffRuntime 不再使用模块级 WeakMap；跨两个 BattleContext 的注册互不泄漏（新增测试）
