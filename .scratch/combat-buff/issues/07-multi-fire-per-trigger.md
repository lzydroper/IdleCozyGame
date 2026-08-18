# 07 - 一次触发多次效果：效果触发次数与 buff 持续结算分离

Type: task
Status: resolved
定段：Buff 模块触发结算；放大器对效果触发次数的放大属 Effect/Ability 接线。

## 问题

放大器（如「加重灼烧」）使效果一次触发多次时，buff 的 duration / 层数如何结算？

## Answer

- 效果可被放大器提高**触发次数（fireCount）**；一次触发时效果被触发 N 次（N 次独立计算/落地）。
- buff 的**持续结算独立于 fireCount**：一次触发结算只让 duration −1 一次（见 `01`），层数默认不变。
- 例：灼烧 5 层、剩余 2 回合，被「加重灼烧」（灼烧生效 2 次）→ 下一次触发：灼烧效果触发 2 次，结算后层数仍 5，duration 2→1（**不得变 0**）。
- 层数变化的唯一来源是 Stack（挂载 +增量）与显式消耗（见 `05`），与 fireCount 无关。
- **待定 fog**：N 次触发是否 = N 次独立 `resolveEffect`（N 个 `effectApplied` / 「受到伤害」事件）。当前按「触发两次 = 两次独立落地」理解；若后续要求多份合并为单次事件，属 Effect 聚合，另立 ticket。

## Comments

由 Buff.md 讨论定案（用户澄清：结算指持续时间，不能一次触发让 duration 变 0）。