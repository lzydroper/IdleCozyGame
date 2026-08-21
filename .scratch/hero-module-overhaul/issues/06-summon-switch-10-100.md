# 招募「切换」按钮：10 抽 / 100 抽

Status: resolved
Type: task
Blocked by:

## Question

实现「切换」按钮的 10 抽 / 100 抽切换（已确认方向：切换影响右侧大按钮，「招募 1 次」保留）：

1. UI：右侧大按钮在「招募 10 次」（1000 灵魂残响）与「招募 100 次」（10000 灵魂残响）间切换，按钮文案与费用显示随之更新；「切换」按钮显示当前模式或可切换提示。
2. 状态层：`state/summon.ts` 支持 100 连抽（`summonTenUpdate` 泛化为批量次数）；注意 100 连必触发 100 抽硬保底（`guaranteedAt: 100`），保底/碎片规则与十连一致。
3. 消耗校验：灵魂残响不足时的提示走统一 Toast（依赖 04 已改的提示通道）。

产出：SummonTab.tsx + state/summon.ts + GameContext 暴露的批量召唤函数 + 测试。

## Answer

（本 session 实施，2026-08-07）

### 状态层（src/state/summon.ts）
- 新增 `summonBatchUpdate(state, count, rng)`：通用批量 N 连抽，循环调用 `summonUpdate`，消耗 `costPerSummon * count`；100 连抽自然触发 100 抽硬保底（guaranteedAt: 100），保底/碎片规则与单抽逐次一致。
- `summonTenUpdate` 改为 `summonBatchUpdate(state, 10, rng)` 的委托（对外签名不变，向后兼容）。

### Context（src/context/GameContext.tsx）
- 接口 `summonTenHeroes` → `summonBatch: (count: number) => MultiSummonResult`（基于 stateRef 同步计算 + setState 提交，同原模式）。

### UI（src/components/SummonTab.tsx）
- 新增 `batchSize: 10 | 100` state（默认 10）。
- 右侧大按钮：`招募 {batchSize} 次` + 费用 `{soulEchoes}/{batchSize * 100}`（动态）。
- 「切换」按钮（原卡池 mock）：点击在 10/100 间切换，文案「切换至 {另一档} 抽」+ RefreshCw 图标 + title 提示；不再弹「更多卡池敬请期待」mock toast。
- 结果标题：`{length} 连招募获得`（动态，单抽仍为「招募获得」）。
- 余额不足提示走统一 Toast（模板化费用文案）。

### 测试
- `src/state/summon.test.ts`：新增 3 例——余额不足不扣、100 连消耗 10000、100 连第 100 抽硬保底必出未拥有英雄且保底重置（确定性 rng）。
- `src/components/SummonTab.test.tsx`：新增 2 例——切换按钮 10↔100 往返、100 连抽显示「100 连招募获得」并扣 10000 余额。
- 验证：全量 `npx vitest run` → **409 passed / 40 files**；`npx tsc -b` 通过；oxlint 仅 1 条既有 useGame 导出警告（非本次引入）。

