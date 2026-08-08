# 02 - 派生属性贡献计算

**What to build:** 新增一个函数，计算每个派生属性（减伤率 damageReduction、免暴击率 critResist、冷却缩减 cooldownReduction、伤害豁免 voidSpirit、负面持续减免 durationReduction、负面数值减免 effectReduction）由哪些元属性贡献了多少值。基于 `PRIMARY_STAT_SCALING_CONFIG` 的映射系数和当前元属性值，返回每个派生属性的贡献来源列表（如：免暴击率 <- 敏捷 3 × 0.1% = 0.3%）。供详细属性面板展开派生属性行时展示元属性贡献列表。

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] 新增函数（如 `getDerivedStatContributions`），输入 `CalculatedEntityStats`（或 `PrimaryAttributes`），返回每个派生属性的元属性贡献列表
- [ ] 贡献列表格式：每条包含元属性名、当前值、系数、贡献值
- [ ] 覆盖所有 6 个派生属性（damageReduction/critResist/cooldownReduction/voidSpirit/durationReduction/effectReduction）
- [ ] 注意：部分派生属性可能没有元属性贡献来源（如 voidSpirit 来自 specialAttributes 而非元属性映射），此类情况返回空贡献列表或标注"固有值"
- [ ] 新增单元测试验证贡献计算正确
