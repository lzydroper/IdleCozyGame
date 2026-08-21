# 英雄界面卡顿优化实施（范围决策 + 落地）

Status: resolved
Type: grilling
Blocked by: 02

## Question

基于 02 的根因清单，决策并实施英雄界面卡顿优化（第 2 点）。范围是核心决策：

1. **优化范围**：
   - 方案 A（局部，低风险）：仅英雄模块——`React.memo` 包裹 `DetailedStatsModal` / `HeroTalentPanel`（props 引用已稳定）、`HeroDetailModal` 内子弹窗条件渲染、经验条去 transition（与 11 联动）。不动 GameContext。
   - 方案 B（全局，高风险高收益）：拆分 `GameContext`（高频 tick 字段 vs 英雄稳定字段两个 Provider，或 selector / useSyncExternalStore）、App.tsx 只渲染 activeTab、actions useCallback、`state/tick.ts` 结构共享短路。影响全仓库 21 处 useGame() 消费者。
2. **验收**：肉眼确认英雄详情/招募界面流畅度明显提升；`npx vitest run` 全量通过；`npm run build` 通过。

产出：范围决策 + 实施改动 + 测试。

## Answer

（本 session 实施，2026-08-07，HITL 范围决策：选方案 A）

### 范围决策
- **方案 A（用户确认）**：tick 短路 + HeroDetailModal 结构修复；不做 App activeTab 渲染（B）与 context 拆分（C，涉及 21 处 useGame 消费者，风险高）。

### R3：applyTick 短路（核心，src/state/tick.ts）
- 开头判断：无活跃系统（发电机/回收站/温室作物/**设施活跃队列**/挂机探索/梦魇冻结）且体力满且未跨天 → **返回原引用**。
- React `setState(prev => prev)` 触发 bailout → GameContext 不再每秒重建 value → 全树（含英雄模块 21 处 useGame 消费者）不再每秒重渲染。
- 注意：设施活跃 = `queue.length > 0`（初始 smelter 单位存在但不活跃，否则短路永不触发）。
- 活跃状态（生产/战斗/体力回复/跨天）行为完全不变。

### R2：HeroDetailModal 结构修复（清 3 条 pre-existing lint）
- `useMemo`（equipFlat、calculatedStats）移到 early return **之前**（hooks 无条件调用，修复 rules-of-hooks 真 bug）；early return 后 `const stats = calculatedStats as CalculatedEntityStats` 断言。
- `EMPTY_EQUIP` 模块级常量替代每次渲染新建的空装备对象（修复 exhaustive-deps）；`calculatedStats` 依赖改为 `[config, hero, equipFlat]`。

### 测试
- 新增 `src/state/tick.test.ts`（4 例）：无活跃系统短路返回原引用、体力未满恢复、跨天推进天数、温室作物活跃不短路。
- 验证：全量 `npx vitest run` → **427 passed / 43 files**；`npm run build` 通过；`npx oxlint`（HeroDetailModal/tick）→ **0 警告**（HeroDetailModal 3 条 pre-existing 已随重构清除）。

### 验收
- 请肉眼确认：英雄详情/招募/全 tab 切换流畅度明显提升（无活跃系统时每秒不再整树重渲染）。
- 遗留（范围外）：App 全 tab 挂载（方案 B）、actions useCallback、context 拆分（方案 C）——后续可按需做。

