# 04 — 胶囊充能使用（无封顶滑条）

**What to build:** 详情弹窗中，稳定胶囊与跃迁胶囊显示「使用」按钮与数量滑条（上限 = 持有数量，无属性封顶约束），效果显示「梦境充能 +N 次」；点击使用按数量消耗背包胶囊，对应梦境充能次数同步增加，梦境探索界面中可见充能次数变化。

**Blocked by:** 03 — 恢复类道具批量使用（滑条 + 封顶）

**Status:** resolved

- [x] 使用 N 个胶囊：背包 -N、对应梦境充能 +N 次
- [x] 滑条上限 = 持有数，无属性封顶
- [x] 梦境探索界面的充能次数显示随使用同步更新
- [x] 状态层与组件测试覆盖，全量测试/构建/lint 绿

## Answer

已在分支 `hero-ehco` 完成（commit `292b360`），全量 355 测试通过（+4）、tsc/vite build 绿、oxlint 保持基线 2 错误（7 警告不变，零新增）。

**实施要点**：
- `applySupplyItemUpdate` 接线 `capsuleCharge` 效果：消耗 N 个胶囊 → `exploration.capsulesCharge` 对应键 +N（不可变更新：`{ ...capsulesCharge, [key]: ... }`，避免浅拷贝共享引用污染旧 state，review should-fix）；同时删除 ticket 01 的防吞保护（充能已接线，胶囊不再拒绝消耗）；
- `ItemDetailModal` 使用区扩展充能类（`useEffect.capsuleCharge` 非空）：滑条上限 = 持有数（无属性封顶），效果预览「梦境充能 +N 次」，批量使用后弹窗停留、持有数量与滑条实时更新；「属性已满」文案仅对恢复类生效；
- 测试：`expansion.test.tsx` 将 ticket 01 的「防吞」测试替换为「批量充能」测试（背包 -2、稳定胶囊充能 3→5）并新增跃迁胶囊充能用例；`ItemDetailModal.test.tsx` 新增 2 例（滑条上限=持有数无封顶、批量使用实时更新）；`DreamscapeTab.test.tsx` 新增入口页充能显示用例（稳定 3 次/跃迁 0 次，由 state 驱动）。

