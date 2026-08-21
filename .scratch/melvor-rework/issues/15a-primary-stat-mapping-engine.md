# 15a — 三层属性基础数据模型与元属性加成映射引擎

**What to build:**
构建纯函数驱动的三层属性引擎底层数据结构与元属性映射逻辑。元属性（力量、体质、敏捷、智慧、意志、超越）在升级、加点、升星、觉醒时提升，并对基础属性（攻击、防御、生命、魔力、暴击率、暴击倍率）提供额外的动态增益加成，而非简单的替换导出。废除虚高综合战力 (Power) 展示，提供全面的元属性加成映射单元测试。

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] 在 `src/state/statSystem.ts` 中定义 `PrimaryAttributes`, `BaseAttributes`, `SpecialAttributes` 及其基础面板结构
- [x] 实现元属性向基础属性额外增加/影响的计算公式（力量→攻击/暴倍，体质→生命/防御，敏捷→暴击率/免暴击，智慧→魔力/奥术增幅）
- [x] 编写 `src/state/statSystem.test.ts` 验证元属性加成计算的准确性

