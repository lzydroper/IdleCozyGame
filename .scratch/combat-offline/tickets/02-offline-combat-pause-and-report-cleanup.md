# 02 — 挂机战斗离线暂停与离线报告清理

**What to build:** 彻底停止玩家离线期间的挂机战斗计算。从 `calculateDetailedOfflineProgress`（`src/state/offline.ts`）中删除战斗结算循环，清理 `OfflineReport` 接口，在 `App.tsx` 离线弹窗中彻底移除战斗战报区块，仅展示体力恢复与避难所收益。确保离线前挂机数据 `combat.idle` 原样保留并在上线后自然继续，且避难所升级、产线、温室、远征离线推进严格不受影响。

**Blocked by:** 01 — 体力系统独立模块与标准 API 服务化

**Status:** complete

- [x] `calculateDetailedOfflineProgress`（`src/state/offline.ts`）彻底移除 `settleLevelIdleUpdate` 调用与战斗模拟，`state.combat` 原样直通返回。
- [x] 避难所基建升级、发电机/回收站产出、流水线加工、温室生长与自动收割、远征派遣拾荒均严格保全离线推进。
- [x] `OfflineReport` 接口（`src/types/game.ts`）删除 `idleCombat` 字段，`App.tsx` 离线弹窗移除「挂机战斗报告」区块，保留体力自然恢复与物资明细。
- [x] 离线前若处于挂机中，`state.combat.idle` 在离线结算后原样保留不变，玩家上线后在线 Tick 自动继续。
- [x] 单元测试覆盖离线暂停行为，验证离线不产生战斗掉落、不扣除战斗体力（体力正常自然恢复至上限）。
