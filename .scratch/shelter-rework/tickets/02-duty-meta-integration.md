# 02 - dutyMeta 接入产线 tick

**What to build:** 补全设施驻守机制--英雄驻守冶炼炉/组装台时，其 `dutyMeta` 三字段（速度/产量/原料）接入产线 tick 生效。每台设施 unit 可独立驻守 1 名英雄。FacilityUnitCard 增加驻守英雄徽章 UI（指派/解除/加成预览）。

**Blocked by:** 01 - 后勤指派模型统一

**Status:** ready-for-agent

- [ ] 新增 `resolveDutyBonus(state, type, unitIndex) -> HeroDutyMeta | null`（`state/facility.ts`），解析 `DutyAssignment.targetId` 反查 `state.heroes`
- [ ] `getActualDuration` 扩展第三参 `speedMultiplier = 0`（向后兼容），公式 `duration / ((1 + level*0.1) * (1 + speedMultiplier))`
- [ ] `processFacility` 扩展第四参 `dutyMeta?: HeroDutyMeta`，内部影响 duration（速度）、reward qty（产量 `floor(qty*(1+yieldMult))`）、cost qty（原料 `max(1, floor(qty*(1-costRed)))`）
- [ ] `tick.ts` / `offline.ts` 调用 `processFacility` 前先 `resolveDutyBonus` 传入
- [ ] `FacilityUnitCard` 标题栏增加驻守英雄徽章（头像+名称+加成预览），点击弹出英雄选择器，调用 `assignHeroToDuty(heroId, { type:'facility', targetId:'${type}_${index}' })`
- [ ] 驻守解除：徽章"解除"按钮调用 `assignHeroToDuty(heroId, null)`
- [ ] state 层测试：`resolveDutyBonus` + `processFacility` 三字段加成公式、等级与 dutyMeta 乘算叠加、无驻守时行为不变
- [ ] UI 层测试：`FacilityCard` 驻守徽章展示、指派/解除交互；更新 `FacilityCard.test.tsx` 的"指派产线"断言
