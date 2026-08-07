# 相关子弹窗设计语言统一设计

Status: open
Type: grilling
Blocked by: 02

## Question

基于 02 选定的放大规格（字号阶梯/间距），统一英雄详情弹窗挂载的 6 个子弹窗（详细属性 DetailedStatsModal、天赋树 HeroTalentPanel + 内联容器、装备详情 EquipmentDetailModal、装备选择 EquipSelectorModal、英雄档案 HeroDossierModal、批量升级 ExpLevelUpModal）的设计语言，消除现状分裂（用户决策：性能与一致性方向）。

现状问题（已探明）：

1. **UI_TOKENS 未覆盖**：DetailedStatsModal、HeroTalentPanel、HeroDossierModal 完全自绘硬编码容器/字号；天赋树弹窗容器是 HeroDetailModal 内联硬编码（`bg-zinc-900 ... h-[460px]`）。
2. **字号分裂**：HeroDetailModal 7-9.5px、HeroDossierModal/ExpLevelUpModal 9-10px、DetailedStatsModal text-xs（12px）——三套字号并存。
3. **z-index 混乱**：9999（HeroListModal/PartySlotModal）、10000（详情/升级）、10001（属性/天赋树）、10002（档案/装备选择/治疗）——需要弹窗层级规范。

决策点：

1. **UI_TOKENS 扩展**：新增字号阶梯 token（复用 02 选定规格）、卡片/区段样式 token、按钮样式 token、z-index 层级规范；现有 Standard/Equipment/Compact 容器是否需要重命名或扩展。
2. **各弹窗迁移方案**：6 个子弹窗分别如何对齐（容器、头部、区段卡、字号）——逐弹窗列出迁移点；天赋树内联容器是否外提为独立组件/统一 token。
3. **一致性边界**：装备详情（modalContainerEquipment，最大 370px/85vh）与装备选择（modalContainerCompact，360px/75vh）的尺寸差异是否有意为之，是否保留。
4. **详细属性弹窗的字号**：它是 6 个弹窗中唯一 text-xs 级的，向下对齐 02 字号阶梯还是保持较大字号（属性表信息密度高）？

产出：UI_TOKENS 扩展设计 + 逐弹窗迁移清单 + z-index 规范，作为实施（毕业 ticket）的依据。迁移不得改变各弹窗的功能与交互。
