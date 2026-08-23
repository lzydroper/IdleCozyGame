# Buff 数据驱动规范

Type: grilling
Status: open

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
