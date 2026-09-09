# 03 - 同种 buff 不同 source 拒绝（source 锁定首挂载者）

Type: task
Status: resolved
定段：Buff 模块挂载层（applyBuff）；Effect 层只透传结果。

## 问题

同 buffId 单实例下，不同来源重复挂载同种 buff 时，source 如何归属？

## Answer

- 单位已挂有 `buffId=X`（`source=A`）时，**其他 source（B≠A）的同种 buff 在效果层应用时直接拒绝**：`applyBuff` 读到 `incoming.sourceId !== existing.sourceId` → 不刷新、不叠层，返回 `applied=false`。
- 只有**原 source A** 的后续挂载才走 Renew/Stack 更新。
- 实例 `sourceId` 固定为首个成功挂载者；击杀归属等一律读 `instance.sourceId`，不存在 per-stack 多 source。
- 拒绝判定在挂载层（`ctx.applyBuff`，由 applyBuff 效果 executor 调用）执行；`interrupted` 编码是复用 `'negated'` 还是新增 `'sourceConflict'` 由 to-tickets 定，不影响语义。

## Comments

由 Buff.md 讨论定案（用户决策：不同 source 直接拒绝，而非 per-stack 记 source）。