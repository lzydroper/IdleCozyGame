# 07 — 驻守自动化与特殊加成

**What to build:** 指派英雄驻守温室（浇水岗）后自动运行：给未湿润的作物免费浇水维持生长；成熟作物自动收割并按原作物补种（种子不足留空）；驻守英雄特殊加成生效——速度加成让湿润作物长得更快，产量加成让驻守期间所有收割（手动/批量/自动）产出更多。

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] 在线 tick 与离线结算中：驻守自动浇水、自动收割成熟槽、补种原作物（扣种子、种下未湿润、种子不足留空）
- [ ] facilitySpeedMultiplier → 湿润作物生长时间扣减 ×(1+speedMult)
- [ ] facilityYieldMultiplier → 驻守期间所有收割产出 floor(qty × (1+yieldMult))
- [ ] 抽出公共播种策略接口 `autoHarvestAndReplant(state, replantStrategy)`，本 ticket 实现 `'original'`（补种原作物）策略
- [ ] 驻守解除后自动化停止；已湿润槽位保留湿润状态
- [ ] 状态层测试（驻守在线 tick、离线结算、加成数值断言）；全量 `npx vitest run` + `npm run build` + `npm run lint` 绿
