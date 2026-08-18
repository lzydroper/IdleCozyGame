# 概述

参战实体单位概念上的父类，将零散的参战单位收集统合起来，在正式战斗时，对所有的参战单位一视同仁，不额外将敌人特殊配置，英雄的成长、装备等特殊字段在进入战斗结算为快照后一视同仁，保证统一，可维护

拥有以下字段：

1. id
2. name
3. description（移除hero的backstory，统一为description）
4. faction（阵营）
5. 三层属性
6. sprite or icon
7. Ability（攻击、技能被动等，特别的，对应英雄，可能会因为天赋、装备在进入战斗后该处list增加）

英雄则是在此基础上额外拥有天赋(talent)、羁绊(bond)、装备(equipment)、成长(包括levelMilestones)、后勤(Duty)等

敌人则是在此基础上可能派生出boss、nightmare等
