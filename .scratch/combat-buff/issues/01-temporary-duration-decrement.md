# 01 - temporary 递减口径

Type: task
Status: resolved
定段：Buff 模块内；不动 Turn/Effect 既有契约。

## 问题

temporary 的 duration 递减按「触发」还是按「回合结束」？一次触发内效果被放大多次时，duration 是否被多次递减？

## Answer

- temporary 采用**按触发递减**：每次该 buff 的触发**结算**一次，`duration -= 1`；归零即移除 buff 及其注册/所属资源。
- **一次触发结算 = duration 只减 1**，无论该次触发内效果被放大/触发多少次（放大见 `07`）。
- **回合结束不参与递减**——避免「触发被跳过仍被回合结束扣时长」这类 bug。
- 由于递减 = 触发次数，temporary 的 `Trigger` 必须是**每个目标回合至多一次**的时机（如「目标的回合开始前 / 回合结束后」等轮次主时机）；需要「下 N 次攻击」之类消耗语义的，用 forever + 层数消耗（见 `05`），不得用 `temporary(N)` 混淆（呼应 Buff.md 折焰备注）。

## Comments

由 Buff.md 讨论定案（用户决策：按触发递减，回合结束可能有 bug）。