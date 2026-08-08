# 04 - 温室浇水接入 DutyAssignModal 弹窗

**What to build:** 将温室浇水操作员的英雄选择从 `<select>` 下拉改为 DutyAssignModal 弹窗。点击浇水操作员卡片标题栏「驻守」按钮弹出弹窗选英雄，选后展示操作员+托管状态，保留「解除」按钮。

**Blocked by:** 02 - DutyAssignModal 通用英雄选择弹窗

**Status:** ready-for-agent

- [ ] `ShelterTab.tsx` 温室浇水卡片：删除 `<select>` 下拉（`ShelterTab.tsx:598-616` 区域）
- [ ] 标题栏「驻守」按钮 → 打开 DutyAssignModal，`onSelect: (id) => assignHeroToDuty(id, { type: 'waterer', targetId: 'greenhouse' })`
- [ ] 已指派状态展示：操作员名 + 托管状态 + 「解除」按钮（保留现有）
- [ ] 测试：`ShelterTab.test.tsx` 温室浇水弹窗（驻守按钮打开弹窗、选英雄后指派）
