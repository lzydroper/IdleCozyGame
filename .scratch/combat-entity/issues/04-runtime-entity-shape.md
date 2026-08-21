# 04 — 运行时 BattleEntity 形状与双轨收敛

**Type:** grilling
**Status:** resolved

## Question

运行时 Entity 是什么形状？如何消灭 CombatantState flat 面板 + snapshot 双轨？

## Answer

- 运行时 `BattleEntity`：`id, name, kind, role?, side, faction, recipe(EntityRecipe), hp, mp, abilities: ResolvedAbility[], initiative`。
- `description/sprite/icon` 不进运行时。
- `side` 显式给定（英雄→hero，敌人→enemy，召唤物→召唤者同侧），不由 kind 推导。
- `initiative` 在 Entity 装配时算好，Turn 只消费。
- 双轨收敛：删除 flat attack/defense/maxHp 与 snapshot 双轨，保留 recipe 为唯一真相源；面板经 resolveStats 计算。
- 实施时同步勾除 After/Turn#13、After/Ability#9/#14 等（见 07）。
