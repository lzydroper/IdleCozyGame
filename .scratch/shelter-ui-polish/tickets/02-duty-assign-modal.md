# 02 - DutyAssignModal 通用英雄选择弹窗

**What to build:** 新建 `DutyAssignModal` 通用英雄选择弹窗组件（基于 `PartySlotModal` 3 列网格骨架），供产线驻守/温室浇水/远征探索三种后勤指派复用。展示英雄头像/名称/职阶·阵营标签/dutyMeta 加成角标，只列可指派英雄。

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] 新建 `DutyAssignModal.tsx`（src/components/ 下，与 PartySlotModal 同级），props：
  ```
  interface DutyAssignModalProps {
    isOpen: boolean;
    title: string;
    heroes: Record<string, HeroState>;
    onSelect: (heroId: string) => void;
    onClose: () => void;
  }
  ```
- [ ] 过滤条件：只列 `!hero.logisticsFacilityId`（不过滤 wounded）
- [ ] 卡片内容：头像（GameIcon hero）+ 名称 + 职阶·阵营标签（`HERO_CLASS_LABELS`/`HERO_FACTION_LABELS`）+ dutyMeta 角标（速/产/省）
- [ ] 弹窗样式：`UI_TOKENS.modalBackdrop` + `modalContainerStandard`，`createPortal` 到 body，点遮罩关闭，Header X 关闭，可滚动内容区
- [ ] 测试：渲染可指派英雄、职阶/阵营/加成标签、点击 onSelect 回调、空态（无可用英雄）
