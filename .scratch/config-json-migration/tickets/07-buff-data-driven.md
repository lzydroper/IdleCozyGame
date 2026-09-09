# Buff 数据驱动规范

Type: grilling
Status: resolved

## Question

清偿 B§1.3 最后一笔函数字段将就：`BuffConfig.createEffects` 函数退役，buff 全量数据驱动（用户 B2 裁决入图）。需拍板：

1. **公式词表扩展**：FormulaTemplate 增加上下文感知原子——
   - `{ kind: 'perStack'; base: number }`（灼烧：stacks × base）
   - `{ kind: 'livingEnemies'; factor: number }`（战意：存活敌人数 × 系数，读 timingCtx）
   - 目标引用语义 `targetRef: 'holder' | 'attacker'`（折焰打攻击者而非持有者）；
   - 求值器改造点：compileAbilityEffects 目前只读 source.stats，需能消费 timingCtx；
2. **buff json 形状**：`data/combat/buffs/<buffId>.json` 直存 durationKind/renew/stack/stackIncrement/consumeOnTrigger/removable/triggers/effects(EffectTemplate[])；四样例（burn/stun/foldFlame/warSpirit）逐一给出 json 化前后对照；
3. **createEffects 退役路径**：buffTypes 的 BuffConfig 形状改造（effects 模板化）、settleBuffTrigger 读模板经 resolveEffect 结算、被动编译链路（compilePassiveBuffConfig→compileAbilityEffects）与新形状的统一；
4. **stun/applyBuff 衔接确认**：executeStun 直构 BuffInstance 的流程在新形状下不变。

## Answer

两问定稿（HITL，全按推荐案）：

- **W1 词表与模板字段**：
  - 公式原子：`flat(value)` / `perStack(base)`（可被 instance.values 同名键覆盖——灼烧 values.amount 现状语义）/ `livingEnemies(per)`；
  - 目标语义：`targetRef: 'holder'(默认) | 'eventTarget'`；
  - 模板字段只存 `{kind, label?, targetRef?, params}`；id / sourceId / origin={kind:'buff',id} 由**物化器**填充。
- **W2 退役范围 = 一次到位**：四样例 json 化 + 被动编译链统一新形状同批完成；createEffects/BuffConfig 函数字段同批退役。

**buff json 形状与四样例对照**：

| buff | 旧 createEffects 要点 | 新 json 关键段 |
|---|---|---|
| burn | damage → holder，amount = values.amount ?? 30×stacks | `"effects":[{"kind":"damage","label":"burn_tick","targetRef":"holder","params":{"amount":{"kind":"perStack","base":30,"baseOverrideValueKey":"amount"}}}]` |
| stun | 空效果（仅作时长递减锚点） | `"effects":[]`，triggers turnStart/target 不变（D1 快照制语义不变） |
| foldFlame | damage → timingCtx.target（被攻击者），flat 5 | `"consumeOnTrigger":true,"effects":[{"kind":"damage","label":"fold_flame_bonus","targetRef":"eventTarget","params":{"amount":{"kind":"flat","value":5}}}]` |
| warSpirit | statModify → holder，value = 1.5×存活敌人数，source=buff 实例标记 | `"removable":false,"effects":[{"kind":"statModify","label":"war_spirit_recalc","targetRef":"holder","params":{"modifier":{"target":"stat.strength","op":"add","value":{"kind":"livingEnemies","per":1.5}}}}]`（source 标记由物化器填 buffModifierSource(instance)，衔接 hygiene 04 helper） |

**物化器职责（buffRuntime 内，state 层）**：读模板 → 解析公式（flat 直取；perStack 读 instance.stacks 与 values 覆盖；livingEnemies 读 timingCtx.runtime）→ 解析 targetRef → 填 id/sourceId/origin → 交 fireCount 循环与 resolveEffect。被动链统一：compilePassiveBuffConfig 改产出 effects 模板直载的新 BuffConfig，attack/maxHp 类公式在物化时经 battle.resolveStats 解析（M1 一致）。

**衔接确认**：executeStun 直构 BuffInstance 流程不变（applyBuff 查到的是 json 化 stun 配置）；applyBuff executor 不受影响。

**域位置**：`data/combat/buffs/<buffId>.json`（glob 开放集合域）。
