# 07 — stun 意志减免修订（ceil 归零 + 免疫）

**What to build:** 眩晕不再走二元意志抵抗，改为意志时长减免：最终持续 = max(0, ceil(基础持续 × (1 - durationReduction)))；归零则不挂 Buff / 提前结束，目标该回合不跳过；durationReduction 不设 0.80 上限；免疫眩晕仍走 immunityBuff:stun 独立拦截。

**Blocked by:** 02

**Status:** ready-for-agent

- [x] stun 审核从二元意志抵抗移除，来源意志低于目标不再直接 resisted。
- [x] stun 持续按 ceil 公式计算；durationReduction 不做 0.80 clamp。
- [x] 计算后 0 回合时不创建 stun Buff，目标不跳过回合。
- [x] immunityBuff:stun 在意志减免之前拦截，仍返回 negated。
- [x] effectReduction 的 0.80 上限保持不变，与 durationReduction 分开。
- [x] 测试：低意志不再抵抗、高意志缩短/归零、ceil 边界、免疫独立、effectReduction 回归。
