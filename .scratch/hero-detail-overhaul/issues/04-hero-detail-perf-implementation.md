# 英雄详情弹窗性能优化实施（存档节流 + tick 短路 + 弹窗 memo）

Status: claimed
Type: task
Blocked by: 01

## Question

按 01 测量结论（根因 R1/R2/R3 + 加固项）落地实施，消除英雄详情弹窗打开时的每秒全树重渲染与每秒 localStorage 写入：

1. **04a. saveState 防抖/节流**（`GameContext.tsx:167-171`）：存档 effect 从「每次 state 变化即全量写」改为节流（如每 5 秒内最多一次，或防抖到操作静默后写入）；触发时机需保证离线/切换账号等关键路径仍即时落盘（switchAccount/deleteAccount 等显式调用不受影响）。注意 `saveState` 亦被 `loadOrCreateState` 流程外的显式调用使用，只节流 effect 内路径。
2. **04b. applyTick 体力整点短路**（`state/tick.ts:31`）：`needsStaminaTick` 改为仅当体力**跨整点**（`Math.floor(nextStamina) > Math.floor(prev.stamina)`）才返回新对象；无活跃系统 + 未跨天 + 体力未跨整点时返回原引用（React bailout）。设施/温室/挂机探索活跃时保持每秒 tick 不变（timeLeft 每秒推进是功能必需）。**适配 `tick.test.ts:21`**「体力未满 → 正常恢复，不短路」断言（改为「体力未满但未跨整点 → 短路；跨整点 → 恢复 1 点」），并新增跨整点恢复用例。
3. **04c. 弹窗层 memo 加固**：
   - `DetailedStatsModal` 包 `React.memo`（纯 props 组件，无 context 订阅，安全有效）。
   - `HeroDetailModal` 包 `React.memo` + `HeroTab` 的 `onSelectHero/onClose` 用 `useCallback` 稳定 props（否则 HeroTab 每秒重渲染使 memo 失效）。
   - 其余 5 个订阅 context 的子弹窗（HeroDossierModal/ExpLevelUpModal/EquipmentDetailModal/EquipSelectorModal/HeroTalentPanel）**不做 memo**（context 每秒变时无效），依赖 04b 消除每秒重渲染后自然缓解——若 04b 后实测仍有卡顿再评估。
4. **验证**：`npx vitest run` 全量通过；`npm run build`（tsc -b && vite build）通过；`npx oxlint` 无新增问题；手工确认英雄详情打开时滚动/切换流畅（肉眼）。
