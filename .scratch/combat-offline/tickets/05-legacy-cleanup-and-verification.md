# 05 — 冗余配置清理与废弃代码收敛（Contract & Cleanup）

**What to build:** 清理 `COMBAT_CONFIG.maxIdleSettlementSeconds` 等冗余离线结算配置，废弃/删除旧 `IdleCombatReport` 接口，清理旧离线战斗遗留代码与过时测试，执行项目全量构建、代码检查与单元测试，确保 `npm run build`、`npm run lint`、`npx vitest run` 全绿。

**Blocked by:** 02 — 挂机战斗离线暂停与离线报告清理, 03 — 在线挂机连续战斗与中断状态机收敛, 04 — 本地持久化与云端保存隔离及覆写确认

**Status:** ready-for-agent

- [ ] 从 `COMBAT_CONFIG`（`src/data/combatConfig.ts`）中清理 `maxIdleSettlementSeconds` 等无用离线批量结算配置。
- [ ] 清理废弃的 `IdleCombatReport` 类型及未引用的辅助代码。
- [ ] 审查并重构所有与离线挂机、体力计算相关的历史测试用例，删除过时测试，保持新契约测试完整覆盖。
- [ ] 运行 `npm run build`（`tsc -b && vite build`）通过。
- [ ] 运行 `npm run lint`（`oxlint`）无报错。
- [ ] 运行 `npx vitest run` 全量单测通过。
