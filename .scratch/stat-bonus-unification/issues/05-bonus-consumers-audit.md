# 05 — 加成体系全仓审计（研究）

**Type:** research
**Status:** resolved
**Blocked by:** None

## Question

产出一份权威清单（供 01-04 引用，避免各 session 重复侦察）：

- 所有消费 `CombatBonus` / `EquipmentStats` / `ModifiableStat` / `StatModifier` / `calculateEntityStats` 的文件与函数（含 UI 组件与测试），逐处标注当前语义：加算/乘算、clamp、应用时机（战斗入场 / buff 回合 / UI 展示）；
- 四来源（羁绊 / 装备 / 天赋 / 觉醒）聚合逻辑的位置与重复度（addBonus 风格 if 链分布）；
- 战斗 / 展示 / buff 三条路径对面板的消费差异（谁用 `calculateEntityStats`、谁手工算）。

用 explore 子代理解决；产出物（审计清单）追加到本 ticket 的 Answer。

## Answer

（explore 子代理 sa_20260808_022518 全仓审计，file:line 权威清单见会话记录；要点如下）

**A. CombatBonus（bonds.ts:8-12，仅 3 百分比字段）** — 产生：bonds.ts aggregateBonus(:34-42)、equipment.ts getSetBonuses(:93-121，经私有 addBonus :129-133)、talents.ts getTalentBonus(:30-40)、awakening.ts getStarBonus(:87-95)/getAwakenBonus(:110-118)——**四处手写同款 if 链，无共享工具**。应用唯一入口：combat.ts heroToCombatant(:219-240) 手工把羁绊+装备+天赋+觉醒四份百分比逐字段求和拼 attackFactor/defenseFactor/hpFactor；生产调用点 5 处（combat.ts:358/429/569/735、nightmare.ts:77）。展示：formatBonus(:59-63) 被 HeroTab.tsx:128、WildernessTab.tsx:736、HeroTalentPanel.tsx:315（经 formatTalentEffect）消费；**装备套装/神话百分比加成在 UI 不展示数值**（EquipmentDetailModal.tsx:96-98 只显示 tier.description；HeroDetailModal.tsx:80-83 解构时丢弃 percent）。

**B. EquipmentStats（equipment.ts:8-12）** — 产生：getEquippedItemStats(:48-60，base+perEnhance×enhance、×神话 1.5、×阵营 1.3)、getEquippedFlatStats(:63-76)；getHeroEquipmentBonus(:124-127) 即 { flat, percent } 拼接处。应用仅 combat.ts:222→228/236/237。UI：ItemDetailModal/EquipmentDetailModal（:155-156 renderStatRow 又把同一公式手写一遍）/EquipSelectorModal/HeroEquipmentPanel/HeroDetailModal(:81 仅 flat 进面板)。

**C. buffSystem（ModifiableStat/StatModifier/ActiveBuff）** — applyBuffsToStats(:43-121) 语义 (base+flat)*(1+percent)（:79-83 calcBaseStat），debuff 按 effectReduction 减免；**缺陷：元属性类 modifier 累积后不生效**（:106-120 只重算 8 项，primaryAttributes 原样展开）。**零生产引用**——仅 buffSystem.test.ts 引用，战斗里没有 buff 状态机，属「定义完整、未接入」的孤儿系统。

**D. calculateEntityStats（statSystem.ts:75-129）** — 生产调用点**仅 1 个**：HeroDetailModal.tsx:86-102（展示面板）；combatEngine.ts createMonsterStats(:86-111) 内部调用但 combatEngine 整文件仅被测试引用；**heroToCombatant 未使用它**——战斗路径手工算，不含元属性/暴击/减伤，与面板两套数值口径。

**E. 三路径差异** — 战斗路径：职阶成长+里程碑+装备平值+四来源百分比手工求和，伤害 max(1, atk-def)，无元属性/暴击/减伤/buff；展示路径：含元属性换算（statConfig.ts:40-52）与 critRate/critDmg 钳制，**不含羁绊/天赋/觉醒/套装百分比 → 面板与战斗数值不一致**；buff 路径：完整三层引擎但零接入，且战斗伤害公式与 combatEngine 的减伤公式（DEF/(100+DEF)）互相冲突（后者不在本 effort scope，仅记录）。测试覆盖：bonds/equipment/talents/awakening/combat/statSystem/combatEngine/buffSystem 各测试 + 组件测试均围绕现状语义，迁移时需同步改写。
