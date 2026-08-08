# 01-浇水维持生长机制

Type: grilling
Status: resolved
Blocked by: （无）

## Question

浇水改为「维持生长」后，在线 tick 与离线结算中温室生长计算应如何调整？

具体决策：`isWatered` 不再提供 ×2 加速，改为「未浇水则作物不生长（growthTimeLeft 不扣减）、浇水则以基础 1x 生长」。驻守的全局湿润逻辑（`isWateredOnline`）不在本 ticket 处理，移交 T02。

## Context

- `src/state/tick.ts` L87-105：`speedMultiplier = (slot.isWatered || isWateredOnline) ? 2 : 1`，`timeReduced = 1 * speedMultiplier`。
- `src/state/offline.ts` L255-273：离线生长同样用 `speedMultiplier` ×2。
- `src/state/offline.ts` L16-39 `calculateOfflineProgress`（纯函数，测试直接调用）：也是 ×2。
- `GreenhouseSlot.isWatered` 注释（types/game.ts L32）写的是「浇水状态（生长速度翻倍）」——语义需更新。
- 相关测试：`src/context/GameContext.test.tsx` L329+（离线浇水与生长）、`src/state/tick.test.ts`、可能有 greenhouse 纯函数测试。

## Constraints

- 浇水=维持生长：`isWatered === true` → 以 1x 扣减生长时间；`isWatered === false` 且有作物 → 生长时间不扣减（停滞）。
- 生长进度仍由 `growthTimeLeft` 推导（`progress = (growthTime - newTimeLeft) / growthTime * 100`）。
- 不改变 `waterSlotUpdate`/`batchWaterUpdate` 的浇水动作本身（扣 2 魔能、置 isWatered）。
- 梦魇入侵冻结温室（tick 短路）保持不变。
- `tick.ts` 的 `hasActiveSystems` 判断需复核：未浇水作物停滞后是否还计为活跃系统。

## 实现范围（grill 敲定后）

grill 目标：与用户敲定并记录本 ticket Question 中的决策。决策敲定后，实现阶段落实：

- tick/offline 生长计算移除 ×2，改为「未浇水不生长」。
- `calculateOfflineProgress` 语义同步。
- 类型注释更新。
- 相关测试更新/新增（在线 tick、离线结算、纯函数），全量 `npx vitest run` + `npm run build` + `npm run lint` 绿。

## Answer

grilling（HITL）敲定，决策记录：

1. **浇水 = 维持生长**：`isWatered` 不再提供 ×2 加速；湿润作物以基础 1x 生长（在线每 tick 扣 1 秒，离线按秒扣）。
2. **湿润永久**：`isWatered` 保持永久布尔，浇一次永久湿润，直到收割重置（`harvestSlotUpdate`/`batchHarvestUpdate` 已重置 `isWatered=false`）。「不浇水停止生长」仅对从未浇过水的槽位成立。
3. **种下未湿润**：`plantCropUpdate` 播种后 `isWatered=false`，作物停滞；需浇水（手动/批量/驻守/挂机）才开始生长。
4. **停滞语义**：未湿润作物 `growthTimeLeft` 不扣减、`growthProgress` 不变（不回退）；浇水后恢复推进。
5. **hasActiveSystems**：保持「有 cropId 即活跃」（tick.ts 不改），避免停滞期 `lastTick` 冻结导致浇水后跨期补扣生长时间。
6. **离线一致**：`calculateOfflineProgress` / `calculateDetailedOfflineProgress` 中 `timeReduced = slot.isWatered ? elapsedSeconds : 0`（移除 speedMultiplier ×2）。
7. **类型注释**：`GreenhouseSlot.isWatered` 注释由「浇水状态（生长速度翻倍）」改为「湿润状态（维持生长；未浇水则作物不生长）」。
8. **动作不变**：`waterSlotUpdate`/`batchWaterUpdate` 仍扣 2 魔能、置 `isWatered=true`（仅允许未湿润槽位）。

实现范围（已由本 ticket 覆盖）：tick.ts L87-105、offline.ts L255-273 与 L16-39 移除 ×2 改「未湿润不扣减」；类型注释；相关测试更新。驻守（`isWateredOnline` 强制湿润）与挂机逻辑不在本 ticket，移交 T02/T03。
