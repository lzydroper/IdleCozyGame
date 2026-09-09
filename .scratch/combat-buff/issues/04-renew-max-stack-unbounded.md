# 04 - Renew 取 max、Stack 无上限、两策略独立判定

Type: task
Status: resolved
定段：Buff 模块挂载层；策略读自配置，实例不存策略。

## 问题

Renew 刷新是覆盖还是取 max？Stack 有无上限？Renew 与 Stack 同时为 true 时组合语义是什么？

## Answer

- `Renew=true`：`duration = max(现有剩余, 新传入值)`（取 max，不缩短）。
- `Stack=true`：层数 += 新传入增量（配置例 `Stack: true, 1` 的 `1` 即每次挂载增量）；**无 maxStack 上限**。
- 两策略**独立判定**：同时为 true 时，重复获得 = 刷时长（max）**且** 层数 +增量——即「刷时长且 +1 层」的组合，互不排斥。
- `Duration / Renew / Stack` 是**配置层策略**，由 `buffId → config` 注册表提供；实例只记录运行时状态（`stacks / duration / sourceId / targetId / 传入数值`），实例化不改策略（呼应 Buff.md 第 17 行）。

## Comments

由 Buff.md 讨论定案（用户决策：取 max、无上限、各判定一遍即组合）。