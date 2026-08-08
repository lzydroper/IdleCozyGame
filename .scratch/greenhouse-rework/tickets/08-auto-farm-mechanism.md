# 08 — 挂机区域机制

**What to build:** 驻守后可配置温室挂机：选择一种作物种子并开启后，自动持续收割成熟作物、免费给作物浇水、把空槽种上所选种子，直到种子耗光自动停止；离线期间同一循环照常结算，产出计入离线收益报告与日志。

**Blocked by:** 06, 07

**Status:** resolved

- [x] `greenhouse.autoFarm = { enabled, cropId }` 字段（types/game.ts、initialState 默认 `{ enabled:false, cropId:null }`；persistence 浅合并继承默认）
- [x] 状态层 actions：`setAutoFarmCropUpdate`（无前置）、`setAutoFarmEnabledUpdate`（开启校验驻守）、`maybeStopAutoFarmOnSeedDepletion`（种子不足停止）；GameContext 绑定导出
- [x] 解除驻守 → 自动 `enabled=false` 且保留 cropId（shelter.ts clearHeroDuty waterer 分支）
- [x] 在线 tick 与离线结算按 `{ cropId }` 播种策略循环（复用 T07 的 `autoHarvestAndReplantUpdate`/`advanceGreenhouseAutomation`），覆盖驻守的 `'original'`
- [x] 种子种到最后一颗、种不完留空；种子耗光 `enabled=false`（在线每 tick + 离线结算后检查）
- [x] 离线收益并入 recoveredItems + 日志（含「挂机种子已耗光，温室挂机自动停止」）
- [x] 状态层测试：greenhouse.test.ts +5（选种/开关/种子耗光/`{cropId}` 离线播种）、tick.test.ts +2（在线播种与停止）、shelter.test.ts +1（解除驻守联动）、GameContext.test.tsx +1（离线挂机集成）；`npx tsc -b` 通过
