# 03 — 加成来源迁移边界（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 01

## Question

四个加成来源（羁绊 BONDS、天赋 TALENT、觉醒 AWAKEN/STAR、装备 EQUIPMENT 套装 + 平值 + EquipmentStats）各自迁移到修饰符模型的边界：

1. **数据层 vs 转换层**：`src/data/*.ts` 配置（BOND.bonus、TALENT node.effect、AWAKEN passive、SET tierEffects/mythicAffix 等）直接改成修饰符形状，还是数据层保持原样、state 层做形状转换？
2. **EquipmentStats 的归属**：装备平值（flat）是否并入统一修饰符，还是保留独立结构、仅计算层汇合？
3. **levelMilestones**（heroGrowth 里程碑加成）是否并入修饰符体系？
4. **旧存档兼容**：计算层改造是否应保持存档格式不变（heroes.talents / equipment 等字段结构不动）？
5. **敌人/怪物路径复核**：怪物已走 `calculateEntityStats`，是否无需改动、本 effort 不涉及？

## Answer

（HITL grilling，4 个决策点全部确认推荐方案；子问题 5 前提已修正）

- **D1 数据层直接改修饰符形状**：`BOND.bonus`、`TALENT node.effect`、`AWAKEN STAR_STATS_PER_STAR/passive`、`SET tierEffects[].bonus/mythicAffix` 全部改为 `StatModifier[]`，**`CombatBonus` 类型删除**（不留双形态、无转换层）。机械映射规则：`attackPercent: 10 → [{ stat: 'attack', kind: 'percent', value: 0.10 }]`，defensePercent/maxHpPercent 同理；percent 值统一转小数。天赋聚合的 ×level 逻辑保留（`node.effect.map(m => ({...m, value: m.value * level}))`）。
- **D2 EquipmentStats 并入统一修饰符**：`getEquippedFlatStats` 输出 flat 型 `StatModifier[]`（含 perEnhance×enhance、神话 ×1.5、阵营 ×1.3 折算后的结果），与套装 percent 合并为装备来源的完整修饰符数组；**`EquipmentStats` 类型退役**，`getHeroEquipmentBonus` 的 `{ flat, percent }` 双类型拼接消失，UI 重复公式（EquipmentDetailModal.renderStatRow）一并消除。
- **D3 levelMilestones 保持 base 组成部分**：里程碑继续作为基础面板的一部分（直接进 `baseAttributes`，不进修饰符管道）——升级成长是永久基础而非可触发加成，避免在 04 展示层被误显示为加成。
- **D4 旧存档格式不变**：本 effort 全部为配置层/计算层改动，`heroes.talents` / `equipment` 等存档字段结构不动，旧存档无缝兼容（声明性确认，无迁移代码）。
- **D5 敌人路径不动（前提修正）**：05 审计揭示 `combatEngine`（含 `createMonsterStats`）**生产未接入**，怪物现状为 `enemiesToCombatants` 配置直取（hp/attack/defense）——并非"已走 calculateEntityStats"。本 effort **不改敌人路径**，`combatEngine` 孤儿状态维持原样（其接入与伤害公式同属 scope 外）。

**解锁**：04（展示层统一）的阻塞条件（01、03）已全部满足。

**D3 修正（用户补充疑问 2026-08-08）**：`levelMilestones` 类型从 `Partial<BaseAttributes>` **扩展为 `Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>`（三层输入 21 项全覆盖，与 01 D2 对齐）**，但仍作为三层输入直接叠加、**不进修饰符管道、不作为加成展示**（D3 核心「升级成长是永久基础」维持）。顺带发现死配置：现状 `critRate`/`critDmg`/`maxMp` 的里程碑**未生效**（HeroDetailModal 硬编码 `50 / 0.05 / 1.50`，heroes.ts:94-96），只有 attack/defense/maxHp 经 heroMaxHp/heroAttack/heroDefense 生效；扩展时需接通，现有 2 处 critRate 里程碑（heroes.ts:68/164）将真正生效（面板数值变化属预期）。实现影响：`heroes.ts` 类型、`getLevelMilestoneBonus` 返回三层 Partial、`HeroDetailModal` 与未来 `heroToCombatant` 面板快照三层都并入；primary 里程碑经 `calculateEntityStats` 自动折算（strength +5 → attack +10，与 02 D2 一致）。
