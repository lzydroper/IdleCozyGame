# 02 — 统一 Modifier 类型与 StatModifier 兼容过渡（决策）

**Type:** grilling
**Status:** resolved
**Blocked by:** None

## Question

Effect.md 要求把「属性加成」与「修正某次效果数值」统一为一种 `Modifier`（`target: 'stat.<StatKey>' | 'effect.<参数名>'`，`op: 'add' | 'multiply'`），避免 `StatModifier` / `EffectModifier` 两型歧义。但现有 `StatModifier` 已被 statSystem/装备/羁绊/天赋/觉醒/UI 广泛消费。如何在不动摇旧链路的前提下落地统一类型？

候选：

- **A)** 新模块 `modifier.ts` 定义统一 `Modifier`，提供 `fromStatModifier` / `toStatModifier` 适配；战斗快照边界归一化，旧消费端继续产出 `StatModifier`（推荐）。
- **B)** 全仓一次性把 `StatModifier` 替换为 `Modifier`。
- **C)** Effect 内部局部定义新类型，`stat.*` 仍用旧 `StatModifier`。

子问题：

1. `target` 的字符串模板类型：`stat.${StatKey}` 与 `effect.${EffectParamKey}` 如何声明；`EffectParamKey` 首批给哪些键（`damage` / `heal` / `duration` / `value`...）？
2. `op: 'add' | 'multiply'` 与旧 `kind: 'flat' | 'percent'` 的映射是否固定为 `flat → add`、`percent → multiply`？
3. `effect.*` 的聚合语义是否与 `stat.*` 一致：同 target 的 `add` 求和、`multiply` 求和，最终 `(base + Σadd) × (1 + Σmultiply)`，一次应用？
4. 实例移除：`Modifier` 是否携带 `id`，还是由 `BattleContext.addModifier` 返回句柄、存储层保存 id（配置层 `Modifier` 不带 id）？
5. 兼容边界具体放哪：`heroToCombatant` / 战斗快照转换处把 `StatModifier[]` 归一化为 `Modifier[]`？`calculateEntityStats` 是否增加接受 `Modifier[]` 的入口还是先只走适配器？
6. `source?: string` 保留还是必填；UI 来源分解如何从 `Modifier` 恢复旧展示？

产出：`src/state/modifier.ts` 的类型契约 + 适配器签名 + 兼容边界，作为 BattleContext 的 Modifier 注册表与 03 Effect 三阶段 `before` 阶段的依赖。

## Answer

（HITL grilling，用户全部确认推荐方案）

- **D1 类型形状**：新建 `src/state/modifier.ts`，统一类型：

  ```ts
  type ModifierNamespace = 'stat' | 'effect';
  type StatTarget = `stat.${StatKey}`;
  type EffectTarget = `effect.${EffectParamKey}`;
  type ModifierTarget = StatTarget | EffectTarget;
  interface Modifier { target: ModifierTarget; op: 'add' | 'multiply'; value: number; source?: string; }
  ```

  `EffectParamKey` 首批以 `string` 不透明存在，后续每个 EffectKind 再出常量收窄，不在本票穷举。

- **D2 op 映射**：固定 `flat → add`、`percent → multiply`；适配器 `fromStatModifier` / `toStatModifier`。
- **D3 effect.* 聚合**：与 `stat.*` 完全一致——同 target 的 `add` 求和、`multiply` 求和，最终 `(base + Σadd) × (1 + Σmultiply)`，只应用一次。
- **D4 实例句柄**：配置层 `Modifier` 不带 `id`；`BattleContext` 存储 `AppliedModifier { id, modifier }`，`addModifier` 返回句柄 id 供单条移除。
- **D5 兼容边界**：旧链路继续产出/消费 `StatModifier`，`calculateEntityStats` 签名不变；新 Effect/BattleContext 使用统一 `Modifier`，在战斗快照/重算边界用适配器互转。`heroToCombatant` 的 `permanentModifiers` 暂保持 `StatModifier[]`。
- **D6 source**：`source?: string` 可选，兼容现有配置与 UI 来源分解。
