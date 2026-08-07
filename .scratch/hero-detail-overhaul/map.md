# 英雄详情弹窗视觉与性能优化（hero-detail-overhaul）— Wayfinder Map

## Destination

英雄详情弹窗（`HeroDetailModal`）及其挂载的全部子弹窗完成视觉密度放大优化与设计语言统一：消除 7.5px 级超小字号与元素过密，字号/图标/间距放大到舒适可读；6 个子弹窗（详细属性、天赋树、装备详情、装备选择、英雄档案、批量升级）统一到 `UI_TOKENS` 设计语言（字号阶梯、容器、z-index 规范）；性能经测量后按影响清单优化到位。

## Notes

- **领域**：英雄详情 UI、弹窗设计语言（UI_TOKENS）、视觉密度、React 渲染性能。
- **技能**：`grilling`、`domain-modeling`、`prototype`、`research`、`implement`。
- **关键文件**：
  - `src/components/HeroDetailModal.tsx`（642 行主体：三列布局 + 下半部属性面板，挂载 6 个子弹窗）
  - 子弹窗：`DetailedStatsModal.tsx`、`HeroTalentPanel.tsx`（+ 内联天赋树容器）、`EquipmentDetailModal.tsx`、`EquipSelectorModal.tsx`、`HeroDossierModal.tsx`、`ExpLevelUpModal.tsx`
  - `src/data/uiConstants.ts`（UI_TOKENS：modalBackdrop/Standard/Equipment/Compact）
  - 性能历史：13 号 applyTick 短路、17 号 backdrop-blur 移除 + overscroll-contain（遗留：设施活跃时每秒全树重渲染）
- **已确认的用户决策**：
  - 「相关导出界面」= **相关弹出界面（弹窗）**。
  - 优化方向：**布局与视觉密度** + **性能与一致性**（不含内容/信息完善方向）。
  - 详情弹窗主体**保持三列结构**（装备｜头像+养成｜技能+升星觉醒），只做放大优化。
  - 范围：**仅详情弹窗挂载的子弹窗**——6 个组件（详细属性、天赋树、装备详情、装备选择、英雄档案、批量升级）。
  - 性能：**先测量再定**优化范围。
  - 右侧 3 个技能占位槽：**保持占位不动**（Flame 图标 + 「技能 1/2/3」），仅随布局放大。
- **现状基线（已探明）**：
  - 字号分裂：HeroDetailModal 大量 `text-[7px]~[9.5px]`（超小）；DetailedStatsModal/PartySlotModal 用 `text-xs~sm`（12-14px）；HeroDossierModal/ExpLevelUpModal/HeroHealModal 9-10px。
  - UI_TOKENS 未覆盖：DetailedStatsModal、HeroTalentPanel、HeroDossierModal（+ 天赋树内联容器）完全自绘硬编码。
  - z-index 混乱：9999（列表/上阵）、10000（详情）、10001（属性/天赋树）、10002（档案/选择器）。
- **ADR 参考**：ADR-0009（三层属性引擎）、ADR-0014（物品统一模型）、ADR-0015（sprite 单一真相源）、ADR-0017（装备实例）。
- **测试**：组件测试需 `GameProvider` + `ToastProvider` 包裹；`npm run build` 先 `tsc -b`；lint 用 `oxlint`（无 ESLint）。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [英雄详情弹窗性能测量与优化范围](issues/01-hero-detail-perf-measurement.md) — 根因排序：R1 saveState 每秒全量写 localStorage 无节流（GameContext:167-171）；R2 体力未满（regen 3s/点 + 战斗消耗）使 13 号短路几乎不生效 → 每秒 tick 常态；R3 context value 无 memo + 全仓零 React.memo → 全 useGame 消费者每秒重渲染；R4 弹窗 useMemo 依赖均稳定（不重算，不动）；R5 DetailedStatsModal 是纯 props 组件（memo 有效）、其余 5 个订阅 context（memo 无效）。范围：04a saveState 节流 + 04b 体力跨整点才 tick + 04c 弹窗 memo（DetailedStatsModal/HeroDetailModal + HeroTab useCallback）；context 拆分留后续。已毕业出实施 ticket [英雄详情弹窗性能优化实施（存档节流 + tick 短路 + 弹窗 memo）](issues/04-hero-detail-perf-implementation.md)。
- [英雄详情弹窗性能优化实施（存档节流 + tick 短路 + 弹窗 memo）](issues/04-hero-detail-perf-implementation.md) — 04a `createSaveThrottle`（5s 窗口 + 测试环境不节流）+ beforeunload/pagehide 关闭兑底（persistence.test 2 例）；04b applyTick 体力跨整点才 tick（无活跃系统时每秒重渲染 → 每 3 秒 1 次，tick.test 适配+新增跨整点用例）；04c DetailedStatsModal/HeroDetailModal React.memo + HeroDetailModal 内 onClose useCallback + HeroTab useCallback（code-review 修复 memo 恒失效问题）。全量 429/429、build 通过，提交 2a476af。
- [装备详情滚动卡顿修复：移除弹窗 backdrop blur + 滚动容器优化](issues/05-equipment-modal-scroll-lag-fix.md) — 用户实证反馈装备详情滚动明显卡顿：根因是 EquipmentDetailModal 用 UI_TOKENS.modalBackdrop（backdrop-blur-sm）+ 可滚动容器（max-h-85vh overflow-y-auto），滚动时全屏 blur 每帧重绘（17 号结论的 token 路径遗漏）。修复：UI_TOKENS 两个 backdrop 去 blur（保留透明度）+ modalContainerEquipment overscroll-contain；code-review 补漏 ShelterTab 播种选择、App 离线结算（同为可滚动+全屏 blur）。全量 429/429、build 通过，提交 bc38254。

## Not yet specified

- **放大规格数值**：新字号阶梯（7.5px → ?）、图标尺寸、间距 token 的具体值——待 02 原型选定后明确。
- **UI_TOKENS 扩展设计**：字号阶梯/卡片/按钮 token、z-index 规范的具体形态——待 02 选定字号后由 03 决定。
- **性能优化实施清单**：01 测量的结果将毕业出实施 ticket；若测量证明「设施活跃时每秒全树重渲染」是主要瓶颈，全局渲染优化（memo 隔离 / context 拆分）是否纳入范围待 01 结论。
- **各弹窗内部密度细节**：装备详情属性展示、天赋树面板节点尺寸/连线、批量升级滑条布局——在 02/03 或其后续实施中明确。
- **context 拆分（高频/低频 slice）+ actions useCallback**——13 号遗留；01 测量确认其必要但超出本 effort 弹性范围，若 04b 实施后设施活跃场景仍有卡顿再评估纳入。

## Out of scope

- **HeroHealModal（英雄治疗弹窗）**——入口在背包物品详情（ItemDetailModal），不在英雄详情弹窗链路（用户明确仅详情挂载弹窗）。
- **HeroListModal / PartySlotModal（英雄列表 / 上阵选择）**——英雄 tab 层弹窗，不在本 effort。
- **技能占位内容化**——未觉醒英雄的技能区保持占位（用户决策），不做觉醒技能预览等新内容。
- **布局重构**——保持三列结构，不做上下分区/卡片化等结构性重排。
- **新增英雄 / 新系统内容**——本 effort 只优化既有界面视觉与性能，不新增玩法内容。
