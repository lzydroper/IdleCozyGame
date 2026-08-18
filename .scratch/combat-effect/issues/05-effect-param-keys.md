# 05 — effect.* 参数键与 EffectKind 参数模板（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** 03

## Question

统一 Modifier 的 `effect.*` 命名空间需要知道每个 EffectKind 暴露哪些可被修正的参数名。首批 10 个 EffectKind 各有哪些可修正参数？

候选：

- **A)** 每 kind 声明固定可修正参数键：damage→`effect.damage`、heal→`effect.heal`、statModify→`effect.value`+`effect.duration`、stun→`effect.duration`、taunt→`effect.value`、summon→`effect.count`、applyBuff→`effect.duration`；无则不可修正（推荐）。
- **B)** 统一只用 `effect.amount` / `effect.duration` 两个键。
- **C)** 不预声明，配置里自由字符串。

子问题：

1. `EffectInstance.params` 各 kind 的模板字段（如 damage：`{ amount, element?, isCrit? }`）。
2. `effect.*` 键与 params 字段的映射是否一一对应；`effect.damage` 是否等于 `params.amount`？
3. 多参数效果（statModify 同时有数值与持续）如何分别聚合修正？
4. `applyBuff` 的 duration 是修正 Buff 实例的 duration，还是 Effect 再传一层？

产出：`EffectParams` 类型 + 首批参数键表，供 `applyEffectModifiers` 与 executor 实现。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 参数键表**（固定，配置/类型层收窄）：

  | EffectKind | 可修正键 | params 模板字段 |
  |---|---|---|
  | damage | `effect.damage` | `{ amount, element?, isCrit? }` |
  | heal | `effect.heal` | `{ amount }` |
  | statModify | `effect.value` | `{ modifier }` |
  | stun | `effect.duration` | `{ duration }` |
  | dispel | 无 | `{ buffKind? }` |
  | immunityElement | 无 | `{ element }` |
  | immunityBuff | 无 | `{ buffKind }` |
  | taunt | `effect.value` | `{ value }` |
  | summon | `effect.count` | `{ count, snapshot }` |
  | applyBuff | `effect.duration` | `{ buffInstance }` |

- **D2 映射**：`effect.damage` / `effect.heal` / `effect.value` / `effect.count` 指向对应 params 数值字段；`effect.duration` 仅对 `stun`（`params.duration`）与 `applyBuff`（`buffInstance.duration`）有效。
- **D2b 收口**：`statModify / immunityElement / immunityBuff / dispel` 无可修正键；持续时间一律归 Buff 包装，Effect 不消费 duration（与 08 一致）。
- **D3 聚合修正**：每个参数键独立走 `(base + Σadd) × (1 + Σmultiply)`；多参数效果各键互不影响。
- **D4 applyBuff duration**：修正 `buffInstance.duration`，由 applyBuff executor 在调用 `ctx.applyBuff` 前落到实例上。
