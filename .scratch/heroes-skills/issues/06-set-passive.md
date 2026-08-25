# 套装被动：规则与管线

Type: grilling
Status: resolved

## Question

装备被动技能的数据住哪？生效条件、数值曲线、能力边界是什么？

## Answer

- 数据住**套装级**：`equipmentSets.json` 加可选 `passiveSkills`（一套最多一条被动定义），可引用全局能力注册表或内联 passive 本体；单件级不做。
- 生效条件：**集齐三件同系列**（武器/防具/饰品三槽全是该系列）才出现该套装的唯一被动；不加额外强化门槛——门槛语义已被 tierEffects 占据。
- 数值曲线：线性，按套装中**强化等级最低**那件插值（短板定值，不叠加份数）；数据形状与现有 `statPerEnhance` 对称。
- 能力边界：允许触发式效果（Buff 词表），经现成 `abilityPassive` 管线编译成永久 Buff 进战斗；纯数值加成继续走 tierEffects/mythicAffix，不走被动通道——触发式才是被动技能区别于属性加成的本体。
- UI：不占英雄三槽展示，入口在装备/英雄装备面板。
