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

敌人则是在此基础上**不派生父子类**：boss、nightmare 均为敌人的特殊实例，通过配置标记区分（如 `kind: 'boss' | 'nightmare'`），一视同仁地参与战斗

## 装配口径（combat-aftermath 05 拍板）

- **basic_attack = 缺省注入 + 可显式覆盖**：装配层默认为英雄/敌人/召唤物注入普通攻击；实体配置可显式覆盖（替换为其他能力）或清空（表达「没有普通攻击」的单位），三种实体同一规则；非法覆盖由配置校验兜底。
- **入口统一方向**：敌人 / 梦魇 / 召唤物三入口收敛为单一公开入口 `resolveEntity(configRef | id | config)`，随召唤闭环批实施；`enemiesToEntities` 转为内部实现细节。
