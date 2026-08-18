# 04 — 效果审核与抵抗规则（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 03

## Question

Effect 落地在 `before` 阶段统一审核：判断目标抵抗是否高于来源抵抗、该效果是否被无效化、是否执行。审核规则如何按 EffectKind 配置？

候选：

- **A)** 每个 EffectKind 声明 `affinity: 'harmful' | 'beneficial' | 'neutral'` 与 `resist: 'none' | 'will' | 'element'`，Effect 模块按表审核（推荐）。
- **B)** 只保留现有 `effectReduction` / `durationReduction` 数值减免，不做二元命中判定。
- **C)** 所有 harmful 效果都做二元抵抗判定，beneficial 无条件生效。

子问题：

1. 哪些 EffectKind 走二元抵抗（来源命中 vs 目标抵抗），哪些只走数值/持续减免？
2. 二元抵抗公式：来源意志 vs 目标意志？来源奥术增幅 vs 目标奥术抵抗？还是另设 potency/resist 字段？
3. 现有 `effectReduction`（负面数值减免）与 `durationReduction`（负面持续减免）分别作用于哪些参数？
4. 无效化（immunity / 已有同类更高优先级 Buff）在审核链中的顺序：先抵抗、再无效化、最后执行？

产出：审核配置形状 + 首批 EffectKind 的审核映射，供 `resolveEffect` 的 before 阶段实现。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 二元抵抗范围**：仅 `stun` / `dispel` / `immunityBuff` / `taunt` 走二元抵抗；`damage` / `heal` / `statModify` 只走数值公式（`effectReduction` 等），不做命中判定。
- **D2 抵抗公式**：命中判定 = `source.willpower >= target.willpower`；命中后 `target.effectReduction` 减数值、`target.durationReduction` 减持续。
- **D3 审核顺序**：抵抗 → 无效化 → 执行；任一步不通过即 `interrupted`，不进入 during。
- **D4 配置形状**：每 EffectKind 声明 `audit: { affinity: 'harmful' | 'beneficial' | 'neutral'; resist: 'none' | 'will' }`；首批不引入 element 细表（`resist: 'element'` 保留扩展位，不在本次落地）。
