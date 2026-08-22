# 03 动态面板残余

Status: resolved

## 内容

决策依据：combat-aftermath 05 号票 M1「resolveStats 唯一权威」不变式。

1. **heal 钳制解析化**：effectSystem.executeHeal 先取 `ctx.resolveStats(target.id).maxHp` 同步到运行时单位（钳制基准以解析值为准），再调 applyHeal。
2. **被动按动作时解析**：abilityPassive 被动 Buff 的效果取数不再依赖入场静态 stats（视实现改为结算时经 ctx 解析或闭包持 ctx）。
3. **无 statParams 回退收紧**：battleContext.resolveStats 的静默回退（:220）改为抛明确错误（所有实体工厂均产 statParams，回退只可能来自构造残缺）。

## 验收

- maxHp 增益 Buff 生效期内治疗上限随之提高（新增测试）；全量单测通过
