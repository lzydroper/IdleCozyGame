# 02 — applyBuff 挂载语义：source 锁定 + Renew/Stack

**What to build:** 同 buffId 重复挂载按配置执行：相同来源时 Renew 取 max 刷时长、Stack 按增量叠层、两策略独立判定；不同来源在挂载层直接拒绝，不刷新不叠层。applyBuff 返回 applied/refreshed/stacks，效果层透传结果并区分「新建 / 刷新 / 冲突拒绝」。

**Blocked by:** 01

**Status:** ready-for-agent

- [x] 首挂载固定 sourceId；同 buffId 同单位只存在一个实例。
- [x] Renew=true 时 duration 取 max（现有剩余, 新传入值），不缩短。
- [x] Stack=true 时 stacks 增加配置增量，无 maxStack 上限。
- [x] Renew 与 Stack 同时为 true 时，重复获得同时刷时长且叠层。
- [x] 不同 source 重复挂载返回 applied=false，原实例、source、stacks 均不变。
- [x] applyBuff 效果落地时 values 填 stacks；冲突拒绝在效果层的 interrupted 编码语义正确。
- [x] 测试：相同来源刷新/叠层/组合，不同来源拒绝，效果层透传。
