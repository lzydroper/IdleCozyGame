# 03 — 经济实体物品化：UI 展示

**What to build:** 玩家在召唤页看到的货币余额、在英雄详情看到的专属/通用碎片数量与背包一致：展示与扣款校验改读背包条目，升星/召唤交互行为与重构前一致。

**Blocked by:** 02 — 经济实体物品化：状态层迁移

**Status:** resolved

- [x] 召唤页货币余额显示与扣款校验（单抽/十抽、余额不足禁用）读背包 `soul_echo`
- [x] 英雄详情页专属灵魂碎片与共鸣碎片数量显示读背包（`shard_<hero>` / `resonance_shard`），升星按钮可用性判定正确
- [x] 召唤与升星的 UI 交互行为（扣款数值、碎片增减、结果反馈）与重构前一致
- [x] 对应组件测试更新，`npx vitest run`、`npm run build`、`npm run lint` 全绿

## Answer

已在分支 `hero-ehco` 完成（commit `790b205`），全量 329 测试通过（+5）、tsc/vite build 绿、oxlint 与基线一致（零新增）。

**实施要点（TDD：先补测试红 → 实现绿）**：
- 票据 02 已做 UI 最小适配（SummonTab/HeroDetailModal 读背包），本票补齐**展示缺口与测试覆盖**：
- `HeroDetailModal` 升星按钮下方新增升星素材行「专属碎片 X · 共鸣碎片 Y」（读 `inventory.shard_<hero>` / `resonance_shard`）；按钮+素材行包进 `div.flex-col` 容器，保持右列按钮贴底布局（review nit 修复）；
- 组件测试新增 5 例：SummonTab 余额不足 2 例（单抽 <100 / 十抽 <1000 → toast 提示 + 背包不扣款）；HeroDetailModal 3 例（碎片数量显示、碎片不足时升星按钮禁用、升星交互扣背包碎片 10→5 且星级 1→2）；
- `HeroDetailModal.test.tsx` 补 `beforeEach(localStorage.clear())`，消除测试间隐性耦合（review nit 修复）；
- 召唤与升星交互行为与重构前一致（扣款数值、toast 反馈、结果 Modal 均未变更）。
