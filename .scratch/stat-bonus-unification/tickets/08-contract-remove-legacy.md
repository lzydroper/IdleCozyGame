# 08 — 收尾：删除旧形态（Contract）

**What to build:** 迁移全部完成后删除旧形态：`CombatBonus` / `EquipmentStats` / `formatBonus` / `COMBAT_BONUS_META` / 兼容转换层（CombatBonus → StatModifier[]）全仓无引用后移除；全量测试、构建、lint 回归绿。

**Blocked by:** 02 — 战斗单位接入新管道; 03 — 装备来源迁移; 04 — 羁绊/天赋/觉醒来源迁移; 05 — 展示层统一; 06 — 升级里程碑三层全覆盖; 07 — buff 并入同一管道

**Status:** ready-for-agent

- [ ] `CombatBonus` / `EquipmentStats` 类型删除，全仓无残留引用。
- [ ] `formatBonus` / `COMBAT_BONUS_META` / 兼容转换层删除。
- [ ] 全量测试（含各来源、管道、战斗、展示、里程碑、buff 迁移后改写）通过。
- [ ] `npm run build`（tsc -b && vite build）与 `npm run lint` 通过。
