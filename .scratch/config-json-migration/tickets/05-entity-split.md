# 实体多文件拆分规范

Type: grilling
Status: resolved

## Question

英雄夹 `<heroId>/{heroInfo,duty,awaken,talent,growth}.json` 拆分定稿：

> **前置澄清（02 号票修订·路径透明）**：文件/文件夹命名仅为约定，loader 不从路径推导身份；本票拆分规范约束的是「内容如何分文件」，而非命名本身。

## Answer

**E1 英雄五文件分配表（定稿，含用户追问的能力归属澄清）**：

| 文件 | 装载内容 | 来源 |
|---|---|---|
| heroInfo.json | id / name / description / heroClass / faction / baseAttributes / primaryAttributes / specialAttributes? / sprite / iconKey；预留 `abilities?: AbilityRef[]`（未来非觉醒常驻技能位） | heroes.ts 主体字段 |
| duty.json | dutyMeta.bonuses[] 全量（DutyScope/DutyBonus） | heroes.ts dutyMeta |
| awaken.json | awakenedName / passive(StatModifier[]) / **abilityId（引用指针 → combat/abilities/awaken_*.json）** | awakening.ts AWAKEN_CONFIG[heroId] |
| talent.json | HERO_TALENTS[heroId] 专属节点 | talents.ts |
| growth.json | levelMilestones | HeroConfig.levelMilestones |

**能力归属澄清（用户追问）**：英雄无独立 Ability 定义文件——普攻 = 全局共享 basic_attack.json；觉醒技能定义住 combat 域、awaken.json 仅持 abilityId 引用；未来常驻技能走 heroInfo.abilities 引用位。**定义与引用分离，无需第六文件。**

**配套裁决**：HERO_GROWTH_BY_CLASS → progression/growthByClass.json（职阶共享，不入英雄夹）；TALENT_TRUNKS（职阶公共主干）→ progression/talentTrunks.json；HERO_CLASS_LABELS/COLORS/FACTION_LABELS/DESCRIPTIONS → configs/constants/heroDisplay.ts。

**E2 敌人与归并语义（定稿）**：
- 敌人保持单文件 `<enemyId>.json`（字段薄：属性/role/modifiers/abilityRefs）；
- loader 归并语义三条：① 文件夹分组定归属（同夹五文件属同一英雄）；② 缺省文件 = 缺省段（无 awaken.json 即未配置觉醒，不报错）；③ 身份一律取 json 内容 id（路径透明原则），跨文件 id 冲突抛错。

1. **字段归属边界**：现 heroes.ts / heroGrowth.ts / talents.ts（全局树 vs 英雄专属节点）/ awakening.ts 的字段逐项划入五个文件——尤其 talent.json 与全局 talents.json 的关系（公共主干留全局、专属节点进英雄？）；
2. **duty.json 的内容确认**（驻守相关元数据现状在哪）；lore 已裁决归 configs/constants 不入英雄；
3. **enemies 是否拆**：敌人字段较薄，单文件 `<enemyId>.json` 是否足够（含 abilities refs/role/modifiers）；
4. loader 归并行为：五文件如何合成 BattleEntity 装配所需的形状（缺省文件 = 缺省段）。
