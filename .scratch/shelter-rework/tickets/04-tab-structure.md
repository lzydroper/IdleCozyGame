# 04 - 分 tab 结构与组件拆分

**What to build:** 将 ShelterTab 从单一长滚动页面重构为 4 tab 架构（基建/温室/产线/远征），梦魇警报常驻顶部，移除顶部资源指示器和后勤工作日志区块，统一设计语言，拆分组件到 `src/components/shelter/` 子目录。

**Blocked by:** 02 - dutyMeta 接入产线 tick, 03 - 远征机制重设计

**Status:** ready-for-agent

- [ ] 新建 `src/components/shelter/` 子目录：`ShelterTab`（容器+tab栏+路由）/ `ShelterTabBar` / `BaseUpgradeSection` / `GreenhouseSection` / `ExpeditionSection` / `constants.ts`
- [ ] `ShelterTabBar` 组件（类比 `WorkshopCategoryBar`），4 tab + 状态计数（温室可收割数/产线队列数/远征进行中标签）
- [ ] 梦魇警报（`DreamLeakAlertPanel`）常驻 tab 栏上方
- [ ] 移除顶部资源指示器（废旧金属/合金板/口粮/魔能储备）整段
- [ ] 移除后勤工作日志区块（`log.type='logistics'` 分类保留）
- [ ] 统一 section 样式为 `bg-zinc-900/60 border border-zinc-800 rounded-3xl backdrop-blur-md`
- [ ] 移除各 section 内部嵌套滚动区域（`max-h-64` / `max-h-72` / `max-h-[500px]`）
- [ ] 产线 tab 复用 `FacilityCard`（含 ticket 02 驻守 UI）
- [ ] `shelter/constants.ts` 收纳 tab 配置、样式 token、toast 文案
- [ ] UI 层测试：`ShelterTab` 分 tab 渲染、tab 切换、状态计数、梦魇警报常驻、资源指示器已移除
- [ ] 适配 `ShelterTab.test.tsx` 现有 3 个用例（培养槽测试需先切到温室 tab）
