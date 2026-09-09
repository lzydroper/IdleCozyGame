# 09 — 能力激活事件

Type: grilling
Status: resolved
Blocked by: 05

## Question

是否新增「能力激活」事件用于事件流、测试与 UI？

1. 是否新增 `abilityUsed` 事件键（纳入 `BATTLE_EVENT_KEYS` 或作为 Ability 层扩展键）？
2. payload 是否含 `unitId/sourceId`、`abilityId`、`targetIds`、cost paid、cooldown 写入值等？
3. 攻击型能力是否仍派发 `attackAfter`（供「攻击后」触发类 Buff 使用），与 `abilityUsed` 并存？
4. 展示层是否通过 `registerBattleEventPresenter` 注册 `abilityUsed` 展示回调？

产出：Ability 事件键与 payload 契约。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 事件键**：新增 `abilityUsed`，纳入 `BATTLE_EVENT_KEYS`。
- **D2 payload**：`{ abilityId, targetIds: string[], costPaid?: {resource,amount}|null, cooldownSet: number, priority: number }`。
- **D3 attackAfter 并存**：攻击型能力仍派发 `attackAfter`（供「攻击后」触发类 Buff），与 `abilityUsed` 并存。
- **D4 展示**：通过 `registerBattleEventPresenter` 注册 `abilityUsed` 展示回调。
