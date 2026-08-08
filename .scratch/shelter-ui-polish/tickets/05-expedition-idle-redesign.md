# 05 - 远征未派遣状态按原型重构

**What to build:** 将远征未派遣状态从「步骤1/2/3」引导 + select 下拉重构为原型风格：标题栏「派遣」按钮 → DutyAssignModal 选探索员，已选后显示「探索员：XXX」+「更换」按钮，卡片式选地点，口粮提示，开始派遣按钮。已派遣状态召回按钮移标题栏。

**Blocked by:** 02 - DutyAssignModal 通用英雄选择弹窗, 04 - 温室浇水接入 DutyAssignModal 弹窗（同文件 ShelterTab.tsx 顺序执行）

**Status:** ready-for-agent

- [ ] 未派遣状态：移除「步骤1/2/3」引导布局（`ShelterTab.tsx:778-905` 区域）
- [ ] 标题栏右侧「派遣」按钮（cyan `bg-cyan-500/10 text-cyan-400 border-cyan-500/30`）→ 打开 DutyAssignModal 选探索员，`onSelect: (id) => setSelectedExpExplorerId(id)`
- [ ] 已选探索员后标题栏显示「探索员：{name} [职阶 · 阵营]」+「更换」按钮（cyan）
- [ ] 地点卡片列表（移除「步骤2」标签）：名称/门槛徽章/间隔/拾得（物品名）/口粮消耗，点击选中高亮，门槛不匹配警告（保留现有逻辑）
- [ ] 口粮提示块（移除「步骤3」标签）：当前持有 / 需消耗 / 充足或不足
- [ ] 底部「开始挂机远征派遣」按钮（disabled 逻辑保留：未选探索员/门槛不匹配/口粮不足）
- [ ] 已派遣状态：召回按钮移标题栏（红色 `bg-rose-500/10 text-rose-400 border-rose-500/30`），移除底部全宽召回按钮
- [ ] 测试：`ShelterTab.test.tsx` 远征未派遣（派遣按钮、已选后显示探索员+更换、开始派遣 disabled 逻辑）
