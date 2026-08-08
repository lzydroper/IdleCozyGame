# 05 — 展示层统一

**What to build:** 加成展示收敛到统一文案函数：羁绊面板、天赋节点、装备弹窗的加成文案全部切到 `formatModifiers`；补齐装备套装/神话百分比不显示数值的现状缺陷；装备属性行统一数据源、消除手写重复公式；`formatBonus` / `COMBAT_BONUS_META` / 天赋文案别名删除。

**Blocked by:** 01 — 修饰符核心类型与计算管道（Expand）; 03 — 装备来源迁移; 04 — 羁绊/天赋/觉醒来源迁移

**Status:** ready-for-agent

- [ ] 羁绊面板（上阵队伍区与荒野面板）与天赋节点文案切到 `formatModifiers`。
- [ ] 装备弹窗显示套装/神话百分比加成数值（现状只显示文案不显示数值）。
- [ ] 装备属性行（基础/每级强化/穿戴实例）统一数据源，手写重复公式消除。
- [ ] `formatBonus` / `COMBAT_BONUS_META` / 天赋文案别名删除；全仓无残留引用。
- [ ] 展示组件测试（GameProvider + ToastProvider 包裹）覆盖新文案渲染。
