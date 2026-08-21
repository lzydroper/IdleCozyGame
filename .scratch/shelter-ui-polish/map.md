# 后勤页面 UI 打磨（shelter-ui-polish）

Status: active

## Destination

产出《后勤页面 UI 打磨规范》（`spec.md`）：将 shelter-rework 落地后的四个 UI 缺陷修正至与原型一致——① 统一三种后勤指派（产线驻守/温室浇水/远征探索）的交互为「标题栏带背景色按钮 + 居中弹窗选英雄」；② 修复基建升级项信息显示混乱（下一级消耗去重、消耗显示物品名而非 id）；③ 远征未派遣状态按原型重构（移除步骤1/2/3 引导，改标题栏派遣按钮 + 弹窗 + 卡片式地点选择）；④ 图标映射硬编码（`UPGRADE_ICONS`/`THEME_COLORS`）解耦到 GameIcon 注册表。**交付形态为 spec，实施在定稿后另行安排**。

## Notes

- **领域约定**：
  - 后勤指派 = 英雄被指派到浇水岗 / 探索岗 / 设施驻守（ADR-0018 `DutyAssignment` 统一模型）。
  - 图标单一真相源 = `GameIcon` 注册表（`ICON_SOURCE_REGISTRY`，ADR-0015 模式），新增 upgrade 类型复用 sprite→Lucide→汉字三级回退。
  - 弹窗统一结构 = `createPortal(document.body)` + `fixed inset-0` 遮罩 + 居中卡片（`UI_TOKENS.modalBackdrop/Sub + modalContainerStandard`）。
- **调查基线**：
  - `UPGRADE_ICONS`（`ShelterTab.tsx:47-54`）：`Record<string, React.ReactNode>` 硬编码映射表，虽从配置查 key 但表本身还在组件内。
  - `THEME_COLORS`（`ShelterTab.tsx:57-91`）：`Record<string, {iconBg, iconBorder, buttonClass}>` 按 glow 色值硬编码配色。
  - 基建升级项信息混乱：下一级消耗在升级按钮内（`:405-410`）和详情区（`:421`）重复显示；消耗显示 item id（`${qty}×${item}`）而非物品名。
  - 远征未派遣状态：`ShelterTab.tsx:778-905` 用「步骤1/2/3」引导 + select 下拉，与原型（标题栏派遣按钮+弹窗+卡片式选地点）差异大。
  - 三种指派交互不统一：产线驻守是内联展开按钮组（`FacilityCard.tsx:255-289`）、温室浇水是 select（`ShelterTab.tsx:598-616`）、远征探索是 select（`ShelterTab.tsx:783-799`）。
  - 无通用英雄选择弹窗：`PartySlotModal`（上阵选人，语义相反）、`HeroListModal`（图鉴）、`HeroHealModal`（重伤多选）均不适用；最接近模板是 `PartySlotModal` 的 3 列网格骨架。
  - `GameIcon` 注册表模式：`GameIcon.tsx:24-32`，`ICON_SOURCE_REGISTRY` 按 type 查配置源，sprite→Lucide→汉字三级回退。
  - 原型已验证的交互：`src/components/shelter/prototype.html`（标题栏驻守/派遣按钮 + 居中英雄选择弹窗 + dutyMeta 加成标签）。

## Decisions so far

<!-- 每解析一个 ticket，在此追加一行：名称（链接）+ 一句话结论 -->

- [图标映射解耦到 GameIcon 注册表](issues/01-grilling-icon-decoupling.md) - `UpgradePath.icon` 改为 `LucideIcon` 引用（同 HEROES_CONFIG）；GameIcon 新增 `upgrade` 类型（`expectsSprite:false`）；**全站统一一套 cyan 配色**——删除 `SHELTER_UPGRADES.theme` 字段、`THEME_COLORS` 表、`UPGRADE_ICONS` 表、`accentText` 派生，`getTheme` 返回固定配色，图标 className 统一传 cyan 色。
- [统一后勤指派交互为弹窗选英雄](issues/02-grilling-duty-assign-modal.md) - 新建 `DutyAssignModal`（基于 PartySlotModal 骨架）：props 通用回调式 `{ isOpen, title, heroes, onSelect(heroId), onClose }`；只过滤 `!logisticsFacilityId`（不过滤重伤）；卡片展示头像/名称/职阶·阵营/dutyMeta 角标；弹窗样式用 `UI_TOKENS.modalBackdrop + modalContainerStandard`；产线/温室/远征三处接入点已明确，FacilityUnitCard 多实例各自 useState 控制。
- [基建升级项信息显示优化](issues/03-grilling-upgrade-card-info.md) - 升级按钮只显「升级」（移除内嵌消耗）；消耗明细统一放详情区并显示物品名（`ITEMS_CONFIG[name]`）多材料「 · 」分隔；「下一级」效果预览移入详情区；未解锁升级项继续隐藏（不加锁定卡片）。
- [远征未派遣状态按原型重构](issues/04-grilling-expedition-idle-ui.md) - 未派遣：标题栏「派遣」按钮→DutyAssignModal 选探索员，已选后显示「探索员：XXX」+「更换」按钮；移除步骤1/2/3 引导；地点卡片保留（移除步骤2 标签）；口粮提示移除步骤3 标签；已派遣状态召回按钮移标题栏（红色），移除底部全宽召回按钮。
- [汇编后勤页面 UI 打磨规范 spec](issues/05-task-compile-spec.md) - 《后勤页面 UI 打磨规范》已汇编至 spec.md（Status: ready-for-agent），含 15 条用户故事、5 节实现决策、测试 seam 与适配、Out of Scope。**地图完成，待用户审阅 spec 后进入实施 effort。**

## Not yet specified

<!-- 见 "Fog of war"：在范围内但尚不够 sharp 到能 ticket 化的疑问；随 frontier 推进逐步 graduate -->

（所有 fog 已随 T01-T04 决议 graduate。剩余待定项为实施时细节：DutyAssignModal 的具体 UI 布局、远征地点卡片视觉，归实施 effort 处理。）

## Out of scope

<!-- 已被有意排除在本 effort 之外的工作；关闭的误标 ticket 在此留一行 -->

（暂无）
