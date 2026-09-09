# 04 — temporary 按触发递减与 fireCount 解耦

**What to build:** temporary Buff 每次触发结算后 duration 减 1；一次触发内效果被放大 N 次也只减 1；回合结束不参与递减；duration 归零即移除该 Buff 并注销触发。灼烧端到端：目标回合开始前触发伤害，持续指定回合后自动消失。

**Blocked by:** 03

**Status:** ready-for-agent

- [x] temporary Buff 每次触发结算 duration 减 1，归零移除。
- [x] 一次触发结算只减 1，即使效果被放大/触发多次。
- [x] 回合结束不递减，跳过触发的 buff 不被误扣时长。
- [x] fireCount 放大时，效果触发次数增加但 duration 与层数不变。
- [x] 灼烧在目标回合开始前触发伤害 N 回合后消失。
- [x] 测试：递减次数、回合结束不减、fireCount 解耦、真实回合引擎端到端。
