# 03 - 产线驻守接入 DutyAssignModal 弹窗

**What to build:** 将产线设施（冶炼炉/组装台）的驻守英雄选择从内联展开按钮组改为 DutyAssignModal 弹窗。点击 FacilityUnitCard 标题栏「驻守」按钮弹出弹窗选英雄，选后展示驻守英雄+加成，保留「解除」按钮。

**Blocked by:** 02 - DutyAssignModal 通用英雄选择弹窗

**Status:** ready-for-agent

- [ ] `FacilityCard.tsx`：删除 `showGarrisonPicker` 内联按钮组（`FacilityCard.tsx:255-289` 区域）
- [ ] FacilityUnitCard 标题栏「驻守」按钮 → 打开 DutyAssignModal，`onSelect: (id) => assignHeroToDuty(id, { type: 'facility', targetId: '${type}_${index}' })`
- [ ] 多实例状态：每个 FacilityUnitCard 各自 `useState` 控制弹窗开关
- [ ] 已驻守状态展示：驻守英雄名 + dutyMeta 加成预览 + 「解除」按钮（保留现有）
- [ ] 测试：`FacilityCard.test.tsx` 驻守交互断言更新（内联按钮组 → 弹窗）
