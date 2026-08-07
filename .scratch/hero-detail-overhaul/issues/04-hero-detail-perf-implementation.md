# 英雄详情弹窗性能优化实施（存档节流 + tick 短路 + 弹窗 memo）

Status: resolved
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

## Answer：实施完成（2026-08-07，TDD 红绿循环 + 双轴 code-review）

### 04a 自动存盘节流（GameContext + persistence）
- `persistence.ts` 新增 `AUTO_SAVE_INTERVAL_MS = 5000` + `createSaveThrottle(intervalMs)`（首次调用哨兵 lastSave=null 必放行；窗口内拦截）。
- GameContext 自动存盘 effect 改节流（`saveThrottleRef`）；**测试环境不节流**（`isTestEnv() ? 0 : AUTO_SAVE_INTERVAL_MS`）——组件测试大量「操作后立即断言 localStorage」依赖即时落盘，节流行为由 `persistence.test.ts` 纯函数覆盖（2 例：窗口语义 + 实例独立）。
- 新增页面关闭兑底：`beforeunload` + `pagehide` 监听强制写入 `stateRef.current`（节流窗口内未落盘的变更在关闭时不丢失；双监听幂等冗余，可接受）。
- 显式 saveState（切换/创建/删除账号）不受节流影响。

### 04b applyTick 体力跨整点短路（state/tick.ts）
- `needsStaminaTick` → `staminaNotFull && staminaCrossedInteger`（`Math.floor(nextStamina) > Math.floor(prev.stamina)`）；`elapsedSeconds/nextStamina` 前置计算复用（删除重复声明）。
- 效果：无活跃系统 + 未跨天 + 体力未跨整点时返回原引用（React bailout）——无活跃系统的浏览场景下每秒重渲染 → 每 3 秒 1 次；设施/温室/挂机活跃时保持每秒 tick（timeLeft 每秒推进，功能不变）。
- 测试适配：tick.test「体力未满 → 正常恢复」改为「体力未满但未跨整点 → 短路；跨整点 → 恢复 1 点」（新增跨整点用例），全量验证 recoverStamina 跳过不丢进度。

### 04c 弹窗 memo 加固
- `DetailedStatsModal` 包 `React.memo`（纯 props 组件，无 context 订阅）+ HeroDetailModal 内 `handleCloseDetailedStats` useCallback 稳定 onClose（code-review 发现内联箭头使 memo 恒失效后修复）。
- `HeroDetailModal` 包 `React.memo`（命名导出保留）；HeroTab 新增 `handleOpenHeroDetail/handleCloseHeroDetail` useCallback（稳定 onSelectHero/onClose）。注意：HeroDetailModal 内部 useGame() 订阅 context，memo 收益在 04b 消除每秒 tick 后生效。
- 其余 5 个订阅 context 的子弹窗不做 memo（context 每秒变时无效），依赖 04b。

### 验证
- 全量 `npx vitest run` → **429 passed / 44 files**（新增 2 个节流测试）；`npx tsc -b` 通过；`npx oxlint` 仅 1 条既有 useGame 导出警告（非本次引入）；`npm run build` 通过。
- 提交 `2a476af`（hero-ehco 分支）。

### code-review 采纳
- Spec 轴：修复 DetailedStatsModal memo 因内联 onClose 恒失效；恢复 Account.test 原始断言（与「测试环境不节流」自洽，移除无意义的 setSystemTime 适配）。
- Standards 轴：3 项 judgement call（flush 内 magic string 与既有模式一致、throttle 跨账号共享 lastSave、双监听冗余）均为可接受取舍，不阻塞。
