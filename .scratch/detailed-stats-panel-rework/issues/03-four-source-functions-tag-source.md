# 03 - 四来源产出函数打 source 标签

**What to build:** 修改装备、天赋、觉醒、羁绊四个来源的 modifier 产出函数，在生成每条 `StatModifier` 时打上 `source` 字段标注来源名称。装备来源标注装备名（如"废土利刃"）和套装名（如"废土系列·套装特效"）；天赋来源标注天赋节点名（如"钢铁壁垒"）；觉醒来源区分升星（如"升星·3星"）和觉醒被动（如"觉醒被动"）；羁绊来源标注羁绊名（如"机械搭档"）。

**Blocked by:** 01 - StatModifier 加 source 字段 + 按来源分组聚合

**Status:** resolved

- [ ] `src/state/equipment.ts` - `getEquippedItemStats` 给每条 flat modifier 打 `source: cfg.name`；`getSetBonuses` 给套装特效打 `source: set.name + '·套装特效'`，神话词条打 `source: set.name + '·神话词条'`。注意 `getEquippedFlatStats` 中同属性合并时需保留各自的 source（不再合并，或合并时拼接 source）
- [ ] `src/state/talents.ts` - `getTalentBonus` 的 `flatMap` 中给每条 modifier 打 `source: node.name`
- [ ] `src/state/awakening.ts` - `getStarBonus` 打 `source: '升星·{star}星'`；`getAwakenedPassive` 打 `source: '觉醒被动'`
- [ ] `src/state/bonds.ts` - `aggregateBonus` 给每条 modifier 打 `source: bond.name`
- [ ] 现有测试需更新（测试中 `toEqual` 比较可能需要适配新增的 source 字段，或用 `expect.objectContaining`）
- [ ] `combat.ts` 中 `permanentModifiers` 组装不受影响（source 已在各产出函数内打好）
