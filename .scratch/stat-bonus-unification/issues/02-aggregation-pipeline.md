# 02 — 修饰符聚合与面板计算管道（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 01

## Question

修饰符如何汇入 `calculateEntityStats` 成为唯一面板计算路径？

1. **签名扩展**：`calculateEntityStats` 是新增 modifiers 参数（`calculateEntityStats(params, modifiers)`），还是保持"先聚合出最终 base/primary/special → 再计算"的两步结构？
2. **两阶段顺序**：元属性修饰符（如 strength +5）与基础属性修饰符（如 attack +10）谁先应用——元属性先映射再叠加，还是全部落到最终层后一并算？
3. **buff 的关系**：`applyBuffsToStats`（buffSystem）与常驻加成管道合并为同一管道，还是保持两层（buff 临时、来源常驻）各自消费同一修饰符模型？
4. **maxHp 语义**：百分比加生命时"当前血量按同比例缩放"是战斗入场快照（heroToCombatant）的职责，还是计算层通用规则？
5. **heroToCombatant 改造形态**：是否改为「面板快照（CalculatedEntityStats）+ 战斗单位转换」，取代手工 attackFactor/defenseFactor/hpFactor 拼装？

## Answer

（HITL grilling，4 个决策点全部确认推荐方案）

- **D1 管道 API**：`calculateEntityStats(params, modifiers?: StatModifier[])` —— 签名直接收修饰符数组，内部先聚合再计算；**导出 `aggregateModifiers(mods): ModifierMap`**（每 stat 的 {flat, percent} 总和，含 primary 折算）供 04 展示层与测试复用。现有调用点（HeroDetailModal / createMonsterStats）不受破坏。
- **D2 元属性修饰符**：折算为 base flat 统一计算 —— primary 修饰符的 flat 按 statConfig 系数折算成对应 base 的 flat（strength +5 → attack +10、critDmg +0.025），与基础属性修饰符合并；percent 型 primary 修饰符按 (1+Σpercent) 放大折算值，保持「percent 加算」语义统一。全管道一次 clamp（最终级）。
- **D3 buff 关系**：**同一管道** —— buff 修饰符与常驻修饰符同为 `StatModifier[]` 汇总后一次计算；debuff 的意志减免（effectReduction）作为**聚合阶段的数值调整**保留；`applyBuffsToStats` 退役、其逻辑并入聚合/计算；`tickBuffs`（回合递减）保留。
- **D4 maxHp 语义**：百分比加生命的「当前血量按同比例缩放」= **战斗入场快照职责**（heroToCombatant / 面板快照处），statSystem 纯函数只出面板，不接收当前血量。
- **D5 heroToCombatant 改造形态**：改为「面板快照 + 战斗单位转换」—— 内部收集该英雄全部修饰符（羁绊/装备/天赋/觉醒）→ `calculateEntityStats` 出 `CalculatedEntityStats` → 转 `CombatantState`（hp 按 hero.hp/hero.maxHp 比例缩放，attack/defense/maxHp 取自面板）；**`CombatBonus` 参数退役**。签名细节与来源收集入口归 03 / 实施。

**毕业到 Not yet specified**：buff 功能在游戏中的实际接入（当前零生产引用，无 buff 生产方）属未来功能，不在本 effort 落地；本 effort 只把 `applyBuffsToStats` 的语义并进管道。
