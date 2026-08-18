# 02 — 统一 Modifier 核心与适配器

**What to build:** 提供统一 `Modifier`，用一个形状同时表达属性加成（`stat.*`）与效果数值修正（`effect.*`）。旧 `StatModifier` 继续可用，经适配器与新类型互转，现有消费链不破坏。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `Modifier { target, op: 'add' | 'multiply', value, source? }` 类型落地，`stat.*` 与 `effect.*` 命名空间可区分。
- [ ] 适配器支持 `StatModifier` ↔ `Modifier` 往返；`flat → add`、`percent → multiply`。
- [ ] `effect.*` 聚合同 `stat.*`：`(base + Σadd) × (1 + Σmultiply)`，一次应用。
- [ ] 旧 `StatModifier` 消费链保持编译通过、既有测试通过。
- [ ] 测试覆盖适配往返与聚合结果。
