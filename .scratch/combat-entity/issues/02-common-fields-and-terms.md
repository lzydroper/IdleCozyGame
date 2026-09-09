# 02 — 公共字段集、faction/side 术语与 abilities 引用形态

**Type:** grilling
**Status:** resolved

## Question

公共字段精确集是什么？`faction` 与 `side` 如何避免撞名？`abilities` 如何引用？

## Answer

- `faction` 专属六阵营（`HeroFaction`）；`BattleUnitSnapshot`/`BattleUnitRuntime` 的 `'hero' | 'enemy'` 改名 `side`（`UnitSide`）。
- 敌人强制声明六阵营之一；不引入 undefined/neutral。
- 公共字段：`id, name, description?, kind, faction, baseAttributes, primaryAttributes?, specialAttributes?, modifiers?, abilities?, sprite?, icon?`。
- `description/sprite/icon` 属配置层；英雄 `backstory` 改名 `description`；敌人补 `description?/sprite?/icon?`。
- `abilities: AbilityRef[]`，`AbilityRef = { abilityId: string; overrides?: Partial<AbilityConfig> }`；`ABILITY_CONFIGS` 仍为真相源。
- 基础攻击（basic_attack）的显式/兜底装配方式留到 `/to-spec` 定稿；本决策只定引用形态为 `AbilityRef[]`。
