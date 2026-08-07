# 招募「切换」按钮：10 抽 / 100 抽

Status: claimed
Type: task
Blocked by:

## Question

实现「切换」按钮的 10 抽 / 100 抽切换（已确认方向：切换影响右侧大按钮，「招募 1 次」保留）：

1. UI：右侧大按钮在「招募 10 次」（1000 灵魂残响）与「招募 100 次」（10000 灵魂残响）间切换，按钮文案与费用显示随之更新；「切换」按钮显示当前模式或可切换提示。
2. 状态层：`state/summon.ts` 支持 100 连抽（`summonTenUpdate` 泛化为批量次数）；注意 100 连必触发 100 抽硬保底（`guaranteedAt: 100`），保底/碎片规则与十连一致。
3. 消耗校验：灵魂残响不足时的提示走统一 Toast（依赖 04 已改的提示通道）。

产出：SummonTab.tsx + state/summon.ts + GameContext 暴露的批量召唤函数 + 测试。
