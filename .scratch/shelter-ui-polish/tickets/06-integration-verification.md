# 06 - 集成验证与全量测试

**What to build:** 前述 5 个 ticket 全部完成后进行集成验证：全量测试通过、lint 无新增警告、build 成功、手动验证核心流程。

**Blocked by:** 01 - 图标解耦到 GameIcon 注册表 + 基建升级卡信息显示, 02 - DutyAssignModal 通用英雄选择弹窗, 03 - 产线驻守接入 DutyAssignModal 弹窗, 04 - 温室浇水接入 DutyAssignModal 弹窗, 05 - 远征未派遣状态按原型重构

**Status:** ready-for-agent

- [ ] `npx vitest run` 全量测试通过（含新增 DutyAssignModal.test.tsx、适配的 ShelterTab.test.tsx / FacilityCard.test.tsx）
- [ ] `npx oxlint` 无新增警告
- [ ] `npm run build` 构建成功
- [ ] 手动验证：基建升级卡（按钮只显升级、详情区消耗物品名、图标正常渲染）
- [ ] 手动验证：产线驻守弹窗（驻守/解除/加成预览）
- [ ] 手动验证：温室浇水弹窗（驻守/解除/托管状态）
- [ ] 手动验证：远征未派遣（派遣按钮/弹窗/已选显示/更换/地点选择/口粮提示/开始派遣 disabled）与已派遣（标题栏召回）
