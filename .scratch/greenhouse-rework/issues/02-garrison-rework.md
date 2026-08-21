# 02-驻守重构与加成生效

Type: grilling
Status: resolved
Blocked by: 01

## Question

驻守（waterer）重构后的职责与加成公式：

1. 驻守是否继续「自动浇水」（把未湿润槽位置为 isWatered=true，维持生长）？——按 grilling 结论「保留自动浇水、去掉加速成长」，应保留自动浇水但不再有任何加速含义。
2. **自动收割并播种**：收割成熟槽位后播种什么作物？待 HITL 确认默认方案：补种该槽位原作物（种子不足留空）；若挂机（T03）已开启，则按挂机选定种子播种。
3. `facilitySpeedMultiplier` / `facilityYieldMultiplier` 在在线 tick 与离线结算中的具体应用公式？

## Context

- 现状驻守效果（tick.ts L88、L103）：`isWateredOnline = assignedWatererId !== null` → 所有有作物槽位强制湿润 + ×2 生长。×2 加速已由 T01 移除。
- 现状 dutyMeta 仅用于产线设施（`src/state/facility.ts` `resolveDutyBonus` + `processFacility`），温室完全不应用。
- 英雄 dutyMeta（`src/data/heroes.ts`）：诺娃 `facilitySpeedMultiplier: 0.25`、阿梅 `facilityYieldMultiplier: 0.25`、凯瑟琳 `0.15/0.10` 等。
- 收割逻辑在 `src/state/greenhouse.ts`（`harvestSlotUpdate`/`batchHarvestUpdate`）；tick/offline 目前不收割，本 ticket 需在 tick/offline 中新增驻守自动收割并播种（复用 greenhouse 纯函数或抽出公共 helper）。

## Constraints

- 驻守 = 自动浇水（免费、维持生长）+ 自动收割并播种 + dutyMeta 加成；无任何「加速成长」残留。
- 速度加成：生长时间扣减乘 `(1 + facilitySpeedMultiplier)`（如诺娃 → 1.25x 生长速率）。
- 产量加成：收割产出 `floor(qty * (1 + facilityYieldMultiplier))`（与 processFacility 一致口径）。
- `facilityCostReduction` 不应用。
- 收割播种的产量加成与播种扣种子逻辑，在线与离线必须一致（离线结算 T03 也依赖此口径）。

## 实现范围（grill 敲定后）

grill 目标：与用户敲定并记录本 ticket Question 中的决策（重点：驻守自动收割后播种什么作物）。决策敲定后，实现阶段落实：

- 驻守职责落地：tick/offline 中驻守自动浇水、自动收割成熟槽并补种（方案经 HITL 确认）、dutyMeta 速度/产量生效。
- 新增/更新状态层测试（驻守在线 tick、离线结算、加成数值断言）。
- 全量 `npx vitest run` + `npm run build` + `npm run lint` 绿。

## Answer

grilling（HITL）敲定，决策记录：

1. **驻守职责**（`assignedWatererId` 非空即生效；在线 tick + 离线结算一致）：
   - **自动浇水**：免费将未湿润的有作物槽位置 `isWatered=true`（维持生长，无加速含义）。
   - **自动收割并播种**：收割所有成熟槽位（产出享受产量加成）；收割后**补种原作物**——扣原作物种子、按 T01 规则 `isWatered=false`（种下未湿润）、种子不足留空。
2. **速度加成**：`facilitySpeedMultiplier` → 生长时间扣减乘 `(1 + speedMult)`，仅湿润作物生效：`timeReduced = elapsed * (slot.isWatered ? 1 + speedMult : 0)`。
3. **产量加成**：`facilityYieldMultiplier` → **驻守期间所有收割**（手动、批量、驻守自动）产出 `floor(qty * (1 + yieldMult))`；实现上从 state 反查驻守英雄 dutyMeta 统一应用（新增 `resolveWatererBonus` 之类的解析，不复用设施专用的 `resolveDutyBonus`）。
4. **播种策略接口**：抽公共 helper `autoHarvestAndReplant(state, replantStrategy)`，`replantStrategy = 'original'`（补种原作物，本 ticket 用）| `{ cropId }`（挂机选定种子，T03 传入）。
5. **挂机交叉**：挂机开启时播种目标切换为挂机选定种子（T03 实现），覆盖驻守的补种原作物。
6. **驻守解除**：停止自动浇水/收割/播种；已湿润槽位保留湿润状态；挂机随驻守解除关闭（T03）。
7. **日志**：驻守自动收割聚合记一条日志（作物成熟周期长，不会刷屏）。

实现范围（本 ticket）：`tick.ts`/`offline.ts` 接入驻守自动浇水 + 收割播种 + 加成；`greenhouse.ts` 抽公共 helper 并应用产量加成（含手动/批量收割路径）；测试（驻守在线 tick、离线结算、加成数值断言）。
