# 05 — 纳米修复剂治愈重伤英雄（多选界面）

**What to build:** 详情弹窗中，纳米修复剂显示「使用」按钮（无数量滑条）；点击弹出重伤英雄选择界面（复用现有小队槽位弹窗的 3 列网格 + 勾选 + 确认样式，仅列出当前重伤英雄）；可多选勾选，确认后按勾选数量消耗纳米修复剂并治愈对应英雄（恢复满血）；无重伤英雄时使用按钮禁用。

**Blocked by:** 02 — 背包物品详情弹窗（基础）

**Status:** resolved

- [x] 选择界面仅显示重伤英雄，可多选
- [x] 确认后消耗纳米修复剂数量 = 勾选英雄数，对应英雄重伤消除并满血
- [x] 无重伤英雄时使用按钮禁用
- [x] 状态层与组件测试覆盖，全量测试/构建/lint 绿

## Answer

已在分支 `hero-ehco` 完成（commit `a0b7dba`），全量 366 测试通过（+11）、tsc/vite build 绿、oxlint 保持基线 2 错误（7 警告不变，零新增）。

**实施要点**：
- `state/combat.ts` 新增 `healWoundedHeroesUpdate(state, heroIds)`：全有或全无校验（空选择/数量不足/含非重伤或未知英雄 → NO_OP），消耗数量 = 去重后勾选数（`[...new Set(heroIds)]`，review should-fix：防重复 id 多消耗），治愈英雄重置 `wounded: false` 且 `hp = maxHp`；
- `GameContext` 新增 `healWoundedHeroes(heroIds)`（复用 `stateRef.current` 模式）；
- 新组件 `HeroHealModal`：复用 PartySlotModal 的 3 列网格 + 勾选遮罩（大 Check）+ 确认按钮样式，仅列出重伤英雄（`state.heroes` 过滤 `wounded`），多选 `Set<string>`，无勾选时确认禁用；确认成功 toast 并关闭，失败（修复剂不足）toast 错误；次级弹窗用 `UI_TOKENS.modalBackdropSub`（z-[10002]）叠在详情弹窗之上；
- `ItemDetailModal` 治愈分支：`itemId === 'nanite_injector'`（治愈类道具，当前唯一，注释注明）；使用按钮无滑条/无效果预览，`disabled = 持有 0 || 无重伤英雄`，点击打开 `HeroHealModal`；
- 测试：`combat.test.ts` 批量治愈 5 例（多英雄治愈+消耗、数量不足、含未重伤、空选择、重复 id 去重）；`HeroHealModal.test.tsx` 3 例（仅列重伤、无勾选禁用、多选确认后消耗并满血）；`ItemDetailModal.test.tsx` 3 例（治愈按钮无滑条、无重伤禁用、点击打开选择界面）。

