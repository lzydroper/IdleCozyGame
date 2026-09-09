# 战斗能力系统重构（combat-ability）— Wayfinder Map

Status: complete

## Destination

锁定「Ability（能力）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的实现规格：Ability 配置层、运行时实例、选能力/选目标/派发效果、消耗与冷却、触发型被动编译、战斗内面板重算 seam、能力激活事件全部敲定。**仅覆盖 Ability 模块**；Entity / Level / UI / Offline 各自另立 effort。

## Notes

- **领域**：战斗能力抽象（主动行为 + 触发型被动）、技能选择与目标选择、能力配置数据驱动。
- **技能**：`grilling`、`domain-modeling`、`codebase-design`；决策解决后接 `to-spec` → `to-tickets`。
- **既定约束（不可推翻）**：
  - `docs/combat/Ability.md` 为基线：Ability 是最高层容器，主动行为与持久被动都归结为 Ability；Ability 计算来源侧数值并派发 Buff/Effect，不直接生效、不自行改数；需实现消耗/冷却/触发优先级/JSON 配置铺垫。
  - `docs/combat/Effect.md`、`.scratch/combat-effect/spec.md`：Ability/Buff 只派发 EffectInstance；审核在效果落地统一；AOE 由 Ability 拆多目标；Buff 实例由 Ability 创建后交 applyBuff。
  - `docs/combat/Buff.md`、`.scratch/combat-buff/spec.md`：Buff 生命周期、Trigger、Renew/Stack、fireCount 消费端已定。
  - `docs/combat/Turn.md`、`.scratch/combat-turn/spec.md`：Turn 只驱动骨架；`performAction` 是 Ability 注入 seam；目标选择/选能力/普通攻击兜底归 Ability。
- **已确认的用户决策（chart 阶段）**：
  - 目的地形态 = 决策集 + 可交付规格（不直接实现）；范围 = 仅 Ability。
  - Ability 覆盖 = 主动行为 + 触发型被动；纯属性加成继续走统一 Modifier / bonus source，不迁入 Ability。
  - 配置层 = 新建 `src/data/abilities.ts` 单一配置源，迁移现有普通攻击 + 觉醒技能。
  - targeting = 配置化策略 + 纯函数选择器；单目标进攻受 taunt 覆盖。
  - cost = 通用 `{ resource, amount }` + 运行时 currentMp / canAfford / spendCost；支付在派发前，付不起回落普通攻击。
  - cooldown = 每个自身回合结束 −1（含被跳过回合），减到 0 后下个自身回合可用；施放时按 cooldownReduction 修正。
  - priority = 主动技能选择用优先级排序；被动触发顺序沿用注册 FIFO。
  - 触发型被动 = 由 Ability 配置生成 forever Buff + Trigger，走既有 Buff 层；被动 Buff 不可驱散。
  - 新增 `abilityUsed` 事件；攻击型再保留 `attackAfter`。
  - 战斗内面板重算 = Runtime 携带入场原始三层输入 + permanentModifiers，`BattleContext.resolveStats` 现算 current 面板。
  - Ability 模型 faction 无关；本次不迁移敌人配置。
- **现状（chart 侦察结论）**：
  - `BattleUnitAbility` 现为 `{ id, name?, [key:string]: unknown }` 占位（`src/state/turnEngine.ts`）。
  - 行为硬编码于 `src/state/combat.ts#createDefaultActionExecutor`：冷却闭包 Map、目标固定取首个存活、无 cost/priority；`priority` 全仓无引用。
  - `AwakenSkillConfig` 是唯一有行为语义的技能来源（`src/data/awakening.ts`）；升星/天赋/觉醒被动/羁绊/装备均为纯 StatModifier。
  - `BattleUnitRuntime` 无 currentMp；`BattleContext`/TurnRuntime 无资源扣费 seam。
  - `addModifier` 不重算 `unit.stats`，战斗内 statModify 不影响后续 Ability 取数。
  - 敌人无任何 Ability 入口，普通/BOSS 都走默认攻击。
- **关键文件**：`docs/combat/Ability.md`、`src/state/combat.ts`、`src/state/turnEngine.ts`、`src/state/battleContext.ts`、`src/state/effectSystem.ts`、`src/state/buffTypes.ts`、`src/state/statSystem.ts`、`src/data/awakening.ts`、`src/data/abilities.ts`（待新建）。
- **测试**：`src/state/combat.test.ts`、`turnEngine.test.ts`、`battleContext.test.ts`、`effectSystem.test.ts` 为既有 seam；新增 `src/state/abilitySystem.test.ts`（待实现）断言选能力/选目标/派发/冷却/消耗/事件流。

## Decisions so far

<!-- 每解决一个 ticket 追加一行：gist + 链接 -->

- [Ability 范围与边界](issues/01-ability-scope-and-boundary.md) — 主动行为+触发型被动归 Ability；纯属性加成留 Modifier；Ability 只算值并派发 Buff/Effect；普通攻击=兜底 Ability。
- [Ability 配置注册表与运行时实例形状](issues/02-ability-config-registry-and-runtime-shape.md) — 新建 `src/data/abilities.ts`；`AbilityConfig` → 解析为自包含 `BattleUnitAbility`；Turn 不 import 数据层。
- [公式模板与 Effect 派发](issues/03-formula-and-effect-dispatch.md) — 固定公式模板 union；`effects: EffectTemplate[]`；多目标拆单目标；fireCount 生产端写入 timing 上下文。
- [目标选择策略与嘲讽覆盖](issues/04-targeting-and-taunt.md) — 确定性策略集合（enemy:first/all/lowestHp、ally:self/lowestHpPercent/all）；taunt 覆盖单目标敌方选择；无目标=不可用。
- [主动 Ability 选择算法与兜底](issues/05-active-selection-and-fallback.md) — 过滤冷却0/付得起/有目标 → priority 降序+顺序 → 扣费→写冷却→派发；兜底 basic_attack；无目标 no-op。
- [消耗与资源 seam](issues/06-cost-and-resource-seam.md) — `cost={resource,amount}`，首资源 `mp`；运行时加 `currentMp`；`canAfford/spendCost` 在派发前支付；付不起回落普通攻击。
- [冷却语义](issues/07-cooldown-semantics.md) — 每自身回合结束 −1（含被跳过）；施放时经 cooldownReduction 修正；0 后下回合可用；currentCooldown 存 battle-scoped 运行时实例。
- [触发型被动编译与驱散](issues/08-passive-compilation-and-dispel.md) — setup 编译为 forever Buff+Trigger；`removable` 标记，dispel 只移除 removable；被动 buff 不可驱散。
- [能力激活事件](issues/09-ability-used-event.md) — 新增 `abilityUsed` 事件（abilityId/targetIds/cost/cooldownSet/priority）；攻击型保留 attackAfter；presenter 注册展示。
- [战斗内面板重算 seam](issues/10-battle-stats-resolve-seam.md) — Runtime 携带 raw stat params+permanentModifiers；`BattleContext.resolveStats` 现算当前面板；`unit.stats` 保留入场快照。
- [觉醒技能迁移与英雄能力装配](issues/11-awaken-skill-and-hero-assembly-migration.md) — `AwakenConfig.skill`→`abilityId`；新增 `collectHeroAbilities`；删除 DefaultAbility 适配器。
- [敌人能力入口](issues/12-enemy-ability-entry.md) — 模型 faction 无关；`CombatEnemyConfig` 未来可加 abilities；本次不迁移敌人内容。

## Not yet specified

<!-- fog：转向本 destination 但尚无法精确提问的决策 -->

- fireCount 的「多次落地是否合并为单事件」：沿用 combat-buff 的 fog，本 effort 不展开。
- 更复杂的选敌模型（仇恨值、多 taunt 数值梯度、站位/距离）：当前只定 taunt 标记覆盖，其余未定。
## 🏁 地图完成

combat-ability 全部 12 张 tickets 已解决，Ability 模块决策集完整，way 到 destination 已清晰，可交给 `/to-spec`（出规格）→ `/to-tickets`（出实现票）。

**Destination 达成**：Ability = 配置驱动的能力层，负责来源侧数值计算 + 选能力/选目标 + 派发 Effect/Buff；主动技能统一消耗/冷却/优先级；触发型被动编译为不可驱散的 forever Buff；纯属性加成继续走统一 Modifier。

**决策集速览**：① 范围边界 ② 配置/运行时形状 ③ 公式与 Effect 派发 ④ 目标选择/嘲讽 ⑤ 选能力算法 ⑥ 消耗 seam ⑦ 冷却语义 ⑧ 被动编译/驱散 ⑨ abilityUsed 事件 ⑩ 面板重算 seam ⑪ 觉醒技能迁移/英雄装配 ⑫ 敌人能力入口。

## Out of scope

- **Entity / Level / UI / Offline 四个模块** —— 各自另立 effort。
- **纯属性加成（升星/天赋/觉醒被动/羁绊/装备）** —— 继续走统一 Modifier / bonus source，不迁入 Ability。
- **敌人技能内容迁移与数值设计** —— 本 effort 只定模型入口，不写敌人配置。
- **资源回复管线（MP 回复/最大值成长/UI 展示）** —— 只定消耗契约。
- **战斗内动态获得/失去 Ability** —— 本次只定战前装配。
- **伤害公式数值平衡** —— 沿用 Effect 已定公式，平衡后续独立处理。
- **存档迁移 / 旧测试兼容** —— 不向后兼容旧存档；旧测试不符新功能一律删除（用户决策）。