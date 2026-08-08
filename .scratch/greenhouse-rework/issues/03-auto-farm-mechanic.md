# 03-挂机区域机制

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

挂机区域的状态模型与循环逻辑：

1. `autoFarm` 状态结构放哪、字段是什么（`greenhouse.autoFarm = { enabled: boolean; cropId: string | null }`？）。
2. 开关与选种 action 的签名（GameContext 导出），以及「必须先驻守才能开启」的前置校验放状态层还是 UI。
3. tick 内「收割 → 浇水 → 播种」循环如何推进（按 tick 时间结算），种子耗光停止的精确边界（消耗最后一颗种子后 enabled 置 false？）。
4. 离线结算（`calculateDetailedOfflineProgress`）如何按秒推进同一循环，收益如何并入 `OfflineReport`（recoveredItems + 日志）。

## Context

- 需求原文：挂机区域含启用/关闭按钮、选种按钮；机制为驻守后可选择某个种子，开启后持续收割、浇水、播种对应种子直到种子耗光停止；支持离线计算收益。
- 现有可复用纯函数：`src/state/greenhouse.ts` 的 `harvestSlotUpdate`/`batchHarvestUpdate`/`batchPlantUpdate`/`batchWaterUpdate`（T02 会抽公共 helper）。
- 离线结算框架：`src/state/offline.ts` `calculateDetailedOfflineProgress`（已有挂机战斗/远征/产线的按秒循环先例）。
- 挂机浇水免费（已确认）；种子耗光自动停止（已确认）。
- 与远征挂机的模式差异：远征按 `scavengeInterval` 触发，温室挂机按「成熟→收割」「空槽→播种」的即时状态推进，需设计按秒的推进函数。

## Constraints

- 开启前置：`assignedWatererId !== null`（驻守）才可开启；解除驻守时挂机一并关闭。
- 只播种选定的 `cropId`（`seedCost` 检查、扣种子、种子耗光停止）；不播种其他作物。
- 收割所有成熟槽位（不限作物），浇水所有未湿润槽位（免费）。
- 离线收益：产出并入 `recoveredItems`，并有日志；`autoFarm` 状态（含停止）正确落盘。
- 存档兼容：旧存档无 `autoFarm` 字段 → 按初始默认（`{ enabled: false, cropId: null }`）合并（persistence.ts）。

## 实现范围（grill 敲定后）

grill 目标：与用户敲定并记录本 ticket Question 中的决策（状态结构、循环推进、停止边界、离线结算方式）。决策敲定后，实现阶段落实：

- 类型（types/game.ts）、初始状态（initialState.ts）、存档合并（persistence.ts）、状态层 action（GameContext）、tick 循环、离线结算接入。
- 状态层测试：开启/关闭/选种/种子耗光停止/离线收益（沿用 GameContext.test.tsx / tick.test.ts 模式）。
- 全量 `npx vitest run` + `npm run build` + `npm run lint` 绿。

## Answer

grilling（HITL）敲定，决策记录：

1. **状态结构**：`greenhouse.autoFarm = { enabled: boolean; cropId: string | null }`；`cropId` 非空表示已选种（未驻守也可先选）。初始 `{ enabled: false, cropId: null }`（initialState + persistence 合并默认）。
2. **Action**（GameContext）：
   - `setAutoFarmCrop(cropId | null)`：选种/取消选种，**无前置**（随时可存）。
   - `setAutoFarmEnabled(true)`：校验 `assignedWatererId !== null`（必须驻守）否则失败；`setAutoFarmEnabled(false)` 无前置。
   - 解除驻守（duty=null 或换人）→ 自动 `enabled=false`，**保留 cropId**（重新驻守后可一键恢复开启）。
3. **循环逻辑**（在线 tick 与离线按秒推进一致）：复用 T02 的 `autoHarvestAndReplant(state, replantStrategy)`，挂机开启时传 `{ cropId: autoFarm.cropId }` 覆盖驻守的 `'original'`：
   - 收割所有成熟槽 → 免费浇水未湿润有作物槽 → 播种选定种子到空槽。
   - **种子耗尽边界**：能种几个种几个，种不完的空槽留空；最后一颗种子用完后 `enabled=false`（自动停止，需玩家重新开启）。
4. **挂机开启期间手动播种禁用**（UI 层 T04：播种按钮与空槽点击禁用；状态层 `plantCropUpdate` 保持不动）。
5. **离线结算**：`calculateDetailedOfflineProgress` 中同一循环按秒推进；挂机收割产出并入 `recoveredItems` + 日志；离线期间种子耗光同样触发 `enabled=false`。
6. **日志**：挂机收割与驻守自动收割一致，聚合记一条日志。

实现范围（本 ticket）：`types/game.ts`（autoFarm 字段）、`initialState`/`persistence`（默认与合并）、GameContext actions（`setAutoFarmCrop`/`setAutoFarmEnabled` + 解除驻守联动）、tick/offline 循环接入（复用 T02 helper 的 `{ cropId }` 策略）、状态层测试（开启/关闭/选种/种子耗光停止/离线收益/解除驻守联动）。
