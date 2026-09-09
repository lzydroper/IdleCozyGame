# 06 - 眩晕意志减免修订（durationReduction → ceil → 0）

Type: task
Status: resolved
定段：修订 combat-effect 的 stun 审核口径；effectSystem 的 applyBefore 同步改。

## 问题

眩晕的意志减免用「二元抵抗」还是「时长减免归零」？当前 combat-effect 04 的二元口径与 Buff.md 眩晕备注冲突。

## Answer

- **移除眩晕的二元意志抵抗**（`source.willpower >= target.willpower → resisted` 不再适用于 stun）。
- 眩晕改为**时长减免**：`rounds = max(0, ceil(rounds_base × (1 - durationReduction)))`。
  - `rounds === 0` 即「意志过高 → 眩晕效果归零」：buff 不生效 / 提前结束，目标该回合不跳过。
  - `durationReduction` = 意志 × `WILLPOWER_TO_DURATION_REDUCE`（0.005/意志），**不设 0.80 上限**（区别于 `effectReduction` 的 0.80 clamp），否则「归零」无法达成。
  - 「上取整」保证：`rounds_base=1` 时只有减免 ≥100%（意志 ≥200）才归零，其余仍为 1；多回合时长则连续缩减。
- 免疫独立：免疫眩晕走 `immunityBuff:stun` 标志（Effect 层 `negated`），与意志减免无关。
- **修订对象**：`.scratch/combat-effect/issues/04-effect-audit-resistance.md` 与 `.scratch/combat-effect/spec.md §4`——stun 从二元意志抵抗改为 durationReduction 归零口径。

## Comments

由 Buff.md 讨论定案（用户决策：按 durationReduction 减时长，免疫走另一套，will 不是直接免疫）。