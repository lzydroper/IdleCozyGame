# 三层属性驱动引擎、Buff 系统与百分比减伤公式

Status: accepted

英雄与怪物统一使用纯函数驱动的三层属性引擎，彻底废除战力 (Power) 虚高展示。

## Decision

1. **三层属性结构与影响机制**：
   - **元属性 / 一级属性 (Primary Attributes)**：力量 (STR)、体质 (CON)、敏捷 (AGI)、智慧 (INT)、意志 (WIL)、超越 (TRA)。在升级、加点、升星、觉醒时提升，**额外增加或影响**基础属性。
   - **基础属性 (Base Attributes)**：攻击 (ATK)、防御 (DEF)、生命 (HP)、魔力 (MP)、暴击率 (CritRate%)、暴击倍率 (CritDmg%)。拥有独立的基础面板。
   - **特殊/阵营属性 (Special Attributes)**：奥术增幅/抵抗、机械负荷/进化、梦魇侵蚀、虚无灵体（伤害豁免）、英灵鼓舞、星界引导、魂印驱动。
2. **Buff / Debuff 与临时增益引擎**：
   - 包含回合持续 Buff/Debuff、百分比增幅、固定值加成、负面效果持续/数值减免计算。
3. **百分比减伤公式**：
   $$\text{DamageTaken} = \text{RawATK} \times \frac{100}{100 + \text{DEF}}$$
4. **取消战力计算**：废除综合战力 (Power) 显示，界面直观展示核心基础属性。
