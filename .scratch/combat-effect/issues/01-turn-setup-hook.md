# 01 — Turn 初始化钩子（setup）与 BattleContext 组装时机（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

`runTurnEngine` 在函数内部创建 `TurnRuntime`，外部只能在 `canAct` / `performAction` 回调里拿到它；但 Effect/Buff 需要在第一个 `turnStart` 之前完成 BattleContext 组装与订阅注册。Turn 引擎如何为上层提供这个初始化缝？

候选：

- **A)** 给 `TurnConfig` 增加 `setup?: (runtime: TurnRuntime) => void`，在 runtime 建好、队列排序后、第 1 轮开始前调用一次（推荐）。
- **B)** 把 `runTurnEngine` 拆成 `createTurnRuntime` + `run`，由上层创建 runtime 后自行组装 BattleContext 再交给引擎。
- **C)** 不改 Turn，Battle 层用闭包延迟捕获 runtime（`performAction` 首次调用时再组装），接受 Buff 在首回合无法注册主时机的问题。

子问题：

1. `setup` 的精确调用点：在 `queue.sort` 之后、`while` 循环之前？`maxRounds = 0` 时是否仍调用？
2. `setup` 内允许哪些操作：`register/unregister` 必须可用；是否允许 `dispatchEvent`（若允许，会在 `roundStart` 前产生事件，是否可接受）？
3. `canAct` / `performAction` 回调签名是否保持 `(unit, runtime: TurnRuntime)`，BattleContext 由上层闭包捕获？还是把 BattleContext 放进触发上下文？
4. 该钩子是否影响 Turn 的纯确定性契约（只读配置、不接触 RNG，但可注册订阅）？
5. BattleContext 的生产归谁：`createBattleContext(runtime, initialBattleState)` 放在哪个模块？

产出：`TurnConfig.setup` 的契约（调用点、可执行操作、事件流影响、与 BattleContext 的组装关系），作为 03 Effect 三阶段骨架的前置。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 seam**：给 `TurnConfig` 增加 `setup?: (runtime: TurnRuntime) => void`，一次性初始化钩子；不拆 `createTurnRuntime + run`，不用闭包延迟捕获。
- **D2 调用点**：`queue.sort(compareQueueIds)` 之后、`while` 主循环之前调用；`maxRounds <= 0` 也调用一次（契约稳定，无特判）。此时 `round` 仍为 0，`sep` 为 0。
- **D3 setup 权限**：仅允许 `register/unregister` 与构建 `BattleContext`；不得 `dispatchEvent`、不改 hp/先机/队列。初始战斗态经 `initialBattleState` 注入，不重放为事件；事件流仍从第 1 轮 `roundStart` 开始。
- **D4 回调签名**：`canAct` / `performAction` 保持 `(unit, runtime: TurnRuntime)`；`battle` 由 setup 内创建后经闭包捕获。`TurnTimingContext` 不新增 battle 字段，Turn 不感知 BattleContext。
- **D5 BattleContext 生产**：新建 `src/state/battleContext.ts`，导出 `createBattleContext(runtime, initialBattleState)`；由战斗装配层在 setup 内调用，Turn 保持纯流程引擎。
