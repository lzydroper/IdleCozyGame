# 02 - Trigger 条目形状与 canTrigger 签名

Type: task
Status: resolved
定段：Buff 模块内；TimingKey 复用 Turn.md 分类学，不新增时机。

## 问题

Trigger 数组的每个条目需要哪些字段？「某些单位的某些时机」如何表达？效果的可触发接口以什么输入判定？

## Answer

- Trigger 为数组，每条目形状：`{ timing: TimingKey, unitRef: 'target' | 'source' }`。
  - `TimingKey` 取 Turn.md 时机分类学（轮次主时机 + 细粒度事件）。
  - `unitRef: 'target'` = buff 的目标单位（绝大多数，如灼烧 = 目标的回合开始前）。
  - `unitRef: 'source'` = buff 的来源单位（如「来源阵亡时触发」）。
  - 不设 `'self'` 第三值——`self` 恒等于 `target`，避免三值冗余。
- Buff 按每条 Trigger 把其效果注册到对应时机；注册键建议 `(timingKey, unitId)`，避免「全局事件 × 所有单位 buff」的 O(N×M) 过滤。
- 效果可触发接口：`canTrigger(ctx, timingKey, currentOwnerId): boolean`。时机派发时传入**当前回合归属单位**（或事件相关单位），效果据此判定是否命中自己关注的目标；判定不通过则不计算。

## Comments

由 Buff.md 讨论定案（用户采纳：显式 unitRef 形状）。