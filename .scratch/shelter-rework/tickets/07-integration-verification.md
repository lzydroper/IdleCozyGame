# 07 - 集成验证与全量测试

**What to build:** 前述 6 个 ticket 全部完成后，进行集成验证--全量测试通过、lint 无警告、build 成功、手动验证核心流程。

**Blocked by:** 01 - 后勤指派模型统一, 02 - dutyMeta 接入产线 tick, 03 - 远征机制重设计, 04 - 分 tab 结构与组件拆分, 05 - 硬编码清理与数据驱动化, 06 - ADR 更新

**Status:** ready-for-agent

- [ ] `npx vitest run` 全量测试通过（含适配后的 `ShelterTab.test.tsx` / `FacilityCard.test.tsx` / `PartySlotModal.test.tsx` / `heroesDuty.test.ts`）
- [ ] `npm run lint` 无警告
- [ ] `npm run build` 构建成功
- [ ] 手动验证：4 tab 切换正常、梦魇警报常驻顶部、资源指示器已移除、后勤日志区块已移除
- [ ] 手动验证：浇水指派/解除、设施驻守指派/解除/加成生效、远征派遣/召回/口粮耗尽自动召回
- [ ] 手动验证：英雄指派后勤后禁上阵、切换岗位自动解除原岗位
- [ ] 验证掉落表物品 id 与 `ITEMS_CONFIG` 对齐
- [ ] 确认远征地点口粮数值配置合理（`rationCost` / `rationConsumptionRate`）
