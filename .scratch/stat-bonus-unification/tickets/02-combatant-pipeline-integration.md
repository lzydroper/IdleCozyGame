# 02 — 战斗单位接入新管道

**What to build:** 战斗路径切换到统一管道：`heroToCombatant` 改为「收集该英雄全部来源的修饰符 → `calculateEntityStats` 出面板快照 → 转战斗单位」，「当前血量按 hero.hp/hero.maxHp 比例缩放」；`CombatBonus` 参数退役，5 处战斗调用点适配；尚未迁移的来源（装备/羁绊/天赋/觉醒）经兼容转换进入管道，战斗数值与现状一致（回归保护）。

**Blocked by:** 01 — 修饰符核心类型与计算管道（Expand）

**Status:** ready-for-agent

- [ ] `heroToCombatant` 收修饰符数组、出 `CalculatedEntityStats` 面板快照，attack/defense/maxHp 取自面板；hp 按已损比例缩放（生命上限提高时保持已损比例）。
- [ ] `CombatBonus` 参数退役；5 处战斗调用点（自动战斗/探索遭遇/BOSS/离线挂机/梦魇）适配，行为不变。
- [ ] 来源收集点暂用兼容转换（01 提供），战斗数值与现状一致——全量战斗相关测试通过。
- [ ] 战斗单位端到端测试（测试 seam 2）：面板快照 → 战斗单位数值正确、加成不泄漏到战斗结算写回。
