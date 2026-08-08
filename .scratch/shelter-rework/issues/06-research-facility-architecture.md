# 现有 FacilityCard / 产线架构调研

Type: research
Status: open
Blocked by: (无)

## Question

为 T4（dutyMeta 接入产线 tick）提供事实基础：全面调研现有 FacilityCard 组件架构和产线 tick 数据流，明确 dutyMeta 接入的注入点。

需回答：

1. **FacilityCard 组件树**：`SmelterCard` / `AssemblerCard` -> `FacilityTypeSection` -> `FacilityUnitCard` 的完整 props 传递链路。每个层级接收什么、渲染什么、调用哪些 GameContext 方法？
2. **设施状态结构**：`GameState.facilities` 的完整类型定义。冶炼炉 / 组装台的 unit 列表如何存储？每个 unit 有哪些字段（level / queue / status 等）？
3. **processFacility 数据流**：`src/state/facility.ts` 的 `processFacility` 完整实现。它如何遍历 unit 队列、如何计算 duration、如何产出物品、如何更新 unit 状态？dutyMeta 加成应注入到哪个环节？
4. **getActualDuration 注入点**：当前 `getActualDuration(recipe, level)` 只接收 recipe 和 level。若要接入 dutyMeta，是扩展此函数签名、还是在 processFacility 内部包装、还是新增 `getDutyMultiplier(facilityId)` 辅助函数？
5. **FacilityUnitCard 的 UI 结构**：卡片的布局区域（头部 / 队列 / 控制按钮），驻守英雄 UI 应插入哪个区域？
6. **设施升级 / 扩建机制**：`upgradeFacility` / `expandFacility` 如何修改 unit 列表？驻守状态是否需要在升级 / 扩建时迁移？
7. **GameContext 中的设施相关方法**：哪些方法暴露给组件？`assignHeroToDuty` 统一后应挂在哪里？

### 约束

- 本 ticket 为纯调研，产出事实记录，不做决策。
- 调研结果记录在 `## Answer` 中，供 T4 消费。
- 可由 `/research` subagent 完成。

## Answer

调研已完成（read_only_task subagent），关键结论如下：

### 组件树与数据流

- 三层结构：`SmelterCard`/`AssemblerCard`（:440-471，注入 theme+icon）-> `FacilityTypeSection`（:366-435，自取 `state.shelter.facilities[type]`）-> `FacilityUnitCard`（:73-361，仅传 `unitIndex`，自取 `facilities[type][unitIndex]`）。
- 数据由各层直接从 `GameContext.state` 拉取，不通过 props 下钻。驻守状态需从英雄侧 `heroes[id].logisticsFacilityId` 反查。
- `AutomationFacility`（`game.ts:199-207`）：`id`(类型名)、`name`、`level`、`queue`、`currentProgress`、`timeLeft`、`active`。**无驻守英雄字段**--驻守信息存于 hero 侧 `logisticsFacilityId`（格式 `'smelter_1'`）。
- `FacilityType = 'smelter' | 'assembler'`（`game.ts:196`），多台同类型设施靠数组索引区分。

### processFacility 与注入点

- `processFacility(fac, inventory, seconds)`（`facility.ts:48-123`）：核心 while 循环（:71-110），`duration = getActualDuration(head.id, fac.level)`（:72）、产出（:81-84 `head.reward`）、消耗（:95/104 `consumeInputs`）。
- `getActualDuration`（`facility.ts:15-19`）：`(recipeId, level) -> number`，`Math.max(1, Math.floor(recipe.duration / (1 + level*0.1)))`。UI（:116,206）和状态机（:72,113）共用。

### 推荐注入方案（C+A 组合）

1. 新增 `resolveDutyBonus(state, type, unitIndex) -> HeroDutyMeta | null`（放 `facility.ts`），解析 `'type_index'` 格式反查 `state.heroes`。
2. `getActualDuration` 扩展可选第三参 `speedMultiplier=0`，保持向后兼容。
3. `processFacility` 扩展第四参 `dutyMeta?: HeroDutyMeta`，内部影响：duration（速度，:72/113）、reward qty（yield，:81-84）、cost qty（reduction，:95/104）。
4. `tick.ts:115` / `offline.ts:215` 调用前先 `resolveDutyBonus` 传入。

### 驻守 UI 插入位置

- **标题栏区域（:141-192）**：在副信息行（:151-155）下方插入驻守英雄徽章，与已有的"效率 XX%"（:152）语义同源。
- 交互入口：点击徽章弹出英雄选择器。注意 `FacilityCard.test.tsx:27` 现有断言 `queryByText(/指派.*产线|派遣.*设施/)` 为 null，接入后需更新（文案改用"驻守"避开，或更新断言）。

### 升级/扩建的驻守迁移

- `upgradeShelterStatUpdate`（:250-303）：只改 `level`，unit 索引不变，驻守无需迁移。
- `expandFacilityUpdate`（:216-247）：追加新 unit（level:1, 空, active:true），新 unit 用 `units.length` 作为索引编码。已有 unit 驻守不受影响。
- 当前无删除 unit 操作，索引稳定。

### GameContext 暴露方法

- `assignHeroJob` / `enqueueRecipe` / `removeQueueEntry` / `setFacilityActive` / `expandFacility` / `upgradeShelterStat`。
- 建议新增 `assignHeroToFacility(heroId, type, unitIndex)` + `unassignHeroFromFacility(heroId)`，参考 `assignHeroJobUpdate` 的"先清旧岗位再设新岗位"模式。

### 隔离确认

- `FacilityCard.tsx` 完全与英雄系统隔离，仅 2 处匹配 `'logistics'`（日志类型字符串，:162/403），无任何 hero/duty/dutyMeta/logisticsFacilityId 引用。

Status: resolved
