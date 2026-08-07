# 英雄详情弹窗性能测量与优化范围

Status: resolved
Type: task
Blocked by:

## Question

测量英雄详情弹窗（HeroDetailModal）及其 6 个子弹窗在典型场景下的渲染性能热点，产出按影响排序的优化清单 + 范围建议，为优化实施提供依据（用户决策：先测量再定范围）。

测量维度：

1. **渲染频率**：GameContext 的 tick 机制下，HeroDetailModal 打开时每秒重渲染多少次？「设施活跃（队列非空）/ 不活跃」两种状态的差异（13 号 applyTick 短路后，活跃时仍每秒整树重渲染——确认是否波及弹窗树）。
2. **重算热点**：弹窗内每次渲染的高成本计算点（`calculateEntityStats` useMemo 依赖是否稳定、`getHeroEquipmentBonus`、装备列表过滤/排序、天赋树 SVG 布局、碎片/升星成本计算等），哪些随 tick 重算。
3. **滚动/交互掉帧**：天赋树面板（SVG 连线）、装备选择器网格、详细属性列表的滚动容器在重渲染下的表现（17 号已修 backdrop-blur 与 overscroll-contain，确认残留问题）。
4. **子弹窗挂载方式**：HeroDetailModal 每次渲染都无条件挂载 6 个子弹窗组件（`DetailedStatsModal` 等），这些子组件是否因父级重渲染而连带重渲染（有无 memo 隔离）。

产出：按影响排序的根因清单（文件:行号）+ 每项优化建议（弹窗层 vs 全局渲染层）+ 优化范围建议（哪些纳入本 effort、哪些留给全局架构改造）。若测量证明「设施活跃时每秒全树重渲染」是主要瓶颈，评估弹窗层 memo 隔离能否覆盖、是否需要触及 GameContext 拆分。范围建议即毕业出实施 ticket。

## Answer：测量结论与优化范围（2026-08-07，静态分析 + 代码证据 + 全量测试基线）

方法：代码走查 GameContext 渲染链路与 6 个子弹窗 + `state/tick.ts` 短路逻辑 + 全量测试基线（`npx vitest run` → 427/427 通过，与 hero-module-overhaul 收尾一致；测试中大量 act 警告亦印证 tick 每秒触发）。

### 根因清单（按影响排序）

**R1. 每秒全量 localStorage 写入，无节流** — `GameContext.tsx:167-171`：`useEffect([state])` 每次 state 变化即 `saveState` → `JSON.stringify(整个 GameState)` + `localStorage.setItem`（同步写，阻塞主线程）。这是弹窗滚动/交互持续掉帧的最直接元凶，与弹窗自身代码无关。

**R2. 体力未满 → 每秒 tick 是常态** — `state/tick.ts:31`：`needsStaminaTick = stamina < maxStamina`；`combatConfig.ts` `staminaRegenSeconds: 3`（每 3 秒 +1 点），自动战斗持续消耗体力 → 体力几乎总是未满 → 13 号短路几乎不生效 → 每秒返回新 state 对象 → 每秒全树重渲染 + 每秒存档（R1 触发源）。

**R3. context value 无 memo + 全仓库零 React.memo** — `GameContext.tsx:769-826` value 内联新建（`adjustedState` 每次新建 `:757-766`）；全仓库 grep 无 `React.memo` → 所有 useGame() 消费者（全仓库 21 处组件）每秒重渲染，无任何隔离。

**R4. 弹窗内 useMemo 已正确挡住重算（正面确认，不动）**：HeroDetailModal `equipFlat/calculatedStats`（:78-100）、HeroTalentPanel `tree/placed/byId`（:57-59）、EquipSelectorModal `candidates`（:43-56）依赖引用均稳定（applyTick 不重建 heroes/equipment/equipmentInventory）→ 不重算。剩余开销为组件函数体执行 + JSX 重建 + reconcile（天赋树 SVG + ~30 节点、装备候选列表含逐项 `getEquippedItemStats`、ExpLevelUpModal 的 `applyHeroExp` 预览无 useMemo 但 safeCount=0 短路）。

**R5. 子弹窗挂载方式**：DetailedStatsModal/HeroDossierModal/ExpLevelUpModal 无条件挂载（isOpen 控制显隐），内部 useGame() 订阅使其每秒重渲染（关闭时仅执行 `if (!isOpen) return null`）。其中 DetailedStatsModal 是**纯 props 组件**（无 useGame，grep 确认）→ React.memo 直接有效；其余 5 个订阅 context → memo 无效（context 每秒变）。

### 范围建议（毕业为实施 ticket 04）

- **必做（根因，改动小收益大）**：
  - 04a. **saveState 防抖/节流**（GameContext 存档 effect）——消除每秒全量序列化+写盘。
  - 04b. **applyTick 体力整点短路**——`needsStaminaTick` 改为仅当 `Math.floor(nextStamina) > Math.floor(prev.stamina)`（体力跨整点）才 tick；无活跃系统时每秒重渲染 → 每 3 秒 1 次。设施/温室/挂机活跃时保持每秒 tick（timeLeft 每秒推进，功能必需）。注意：`tick.test.ts:21`「体力未满 → 正常恢复，不短路」断言需适配。
- **推荐（弹窗层加固）**：
  - 04c. DetailedStatsModal `React.memo`（纯展示，安全）+ HeroDetailModal 包 memo + HeroTab 的 `onSelectHero/onClose` useCallback（props 稳定化）。其余 5 个订阅 context 的子弹窗 memo 无效，依赖 04b 消除每秒重渲染后自然缓解。
- **后续（超出本 effort，写回地图 fog）**：context 拆分（高频/低频 slice）+ actions useCallback（13 号遗留）。
