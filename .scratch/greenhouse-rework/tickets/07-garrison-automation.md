# 07 — 驻守自动化与特殊加成

**What to build:** 指派英雄驻守温室（浇水岗）后自动运行：给未湿润的作物免费浇水维持生长；成熟作物自动收割并按原作物补种（种子不足留空）；驻守英雄特殊加成生效——速度加成让湿润作物长得更快，产量加成让驻守期间所有收割（手动/批量/自动）产出更多。

**Blocked by:** 06

**Status:** resolved

- [x] 在线 tick 与离线结算中：驻守自动浇水、自动收割成熟槽、补种原作物（扣种子、种下未湿润、种子不足留空）——`autoHarvestAndReplantUpdate`（'original'）+ 在线 tick 接入；离线 `advanceGreenhouseAutomation` 多轮循环
- [x] facilitySpeedMultiplier → 湿润作物生长时间扣减 ×(1+speedMult)（在线 tick 与离线一致）
- [x] facilityYieldMultiplier → 驻守期间所有收割产出 floor(qty × (1+yieldMult))（`resolveWatererBonus` 反查，覆盖手动/批量/自动收割）
- [x] 抽出公共播种策略接口 `autoHarvestAndReplant(state, replantStrategy)`，实现 `'original'` 策略；`{ cropId }` 策略供 T08
- [x] 驻守解除后自动化停止；已湿润槽位保留湿润状态（tick/offline 均以 assignedWatererId 为条件）
- [x] 状态层测试：greenhouse.test.ts 新增 10 测试（加成反查/自动收割补种/产量加成/离线多轮/速度加成）；tick.test.ts +2 在线驻守测试；GameContext.test.tsx 驻守离线测试改用无速度的 mei；`npx tsc -b` 通过；全量 vitest 除装备系统 3 个 baseline 既有失败外全绿（527 passed）
