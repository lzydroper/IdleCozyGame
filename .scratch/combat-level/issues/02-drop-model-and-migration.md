# 02 — 掉落模型与旧表迁移

**Type:** grilling
**Status:** resolved
**Blocked by:** 01

## Question

掉落与奖励如何从 `CombatDropConfig { itemId, chance(0-1), minQty, maxQty }` + `soulEchoMin/Max` 迁到 Level.md 三形态？需决议：

1. **DropEntry 可辨识联合**：`fixed { itemId, count }` / `chance { itemId, count, chancePercent }` / `weighted { pool: [{ itemId, count, weight }] }` 的字段命名与判别。
2. **整数百分比约定**：`chancePercent` 为整数百分比（`25` = 25%）；weighted 的 UI 概率 = `weight / totalWeight × 100`。
3. **经验如何表达**：经验复用 `exp_tome` 普通物品掉入背包（chart 倾向）；是否彻底移除 `expReward` 直发经验，以及「失败没有掉落/经验」如何保证。**research 09 的换算分歧**：旧 `expReward` 是「每位上阵英雄经验」，改成背包物品后无法按队伍人数动态换算——需在「保底 1 本」「按 `expReward × 队伍人数 / 100` 换算」「彻底删除直发经验只留概率掉落」中三选一。
4. **灵魂残响**：作为普通物品条目 `soul_echo` 进掉落表，删除 `soulEchoMin/Max`；旧 min/max 迁移时取什么代表值（research 09 暂用四舍五入均值，需确认是否接受丢失随机区间）。
5. **首通特殊战利品**：`firstClearDrops` 与常规 `drops` 的区别——首通额外发放、可空；常规可重复。**research 09 提出**：`blueprint_ember_armory` 是否从 BOSS 可重复掉落改为 `firstClearDrops` 首通保底。
6. **旧表迁移规则**：0-1 chance → 整数百分比、`minQty/maxQty` → `count` 的取值规则；`CombatDropConfig` 是否退役。
7. **100% 概率 + 范围数量的表达**：research 09 发现测试区 `enhance_stone 100%, 30–50` 与 `soul_echo 100%, 20–50` 在三形态下无法无损表达——需决定「固定均值」「扩展现有形态支持范围」「引入 weighted 池逼近范围」哪一种。

产出：`DropEntry` 类型与迁移规则，供 08/10 使用。

## Answer

（HITL grilling，全部采用推荐方案。）

- **D1 DropEntry**：可辨识联合，`kind` 判别：
  - `{ kind:'fixed', itemId, count }`
  - `{ kind:'chance', itemId, count, chancePercent }`（整数百分比，`25` = 25%）
  - `{ kind:'weighted', pool: [{ itemId, count, weight }] }`（UI 概率 = `weight / totalWeight × 100`；当前内容无用例，仅保留扩展位）
- **D2 经验**：删除 `expReward` 直发经验；改为固定 `exp_tome` 条目，`count = max(1, round(expReward × 3 / 100))`（队伍固定 3 人，保持旧总经验量）。失败无掉落/无经验由「仅胜利结算 drops」保证。
- **D3 灵魂残响**：`soul_echo` 作为普通 `fixed` 条目进掉落表，`count = round((min + max) / 2)`；删除 `soulEchoMin/Max`。
- **D4 首通**：`firstClearDrops` 与 `drops` 分离；`blueprint_ember_armory` 从旧城废墟关底可重复掉落改为 `firstClearDrops` 首通保底 1 张。
- **D5 迁移规则**：`chancePercent = round(chance × 100)`；`count = minQty === maxQty ? minQty : round((minQty + maxQty) / 2)`；`CombatDropConfig` 退役。
- **D6 100% + 范围**：严格单值塌缩——`100% + minQty/maxQty` 也取四舍五入均值（如测试区 `enhance_stone 30–50 → fixed 40`；具体数值以 research 09 映射表为准）。