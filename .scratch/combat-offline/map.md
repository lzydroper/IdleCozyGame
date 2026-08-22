# 战斗离线与挂机重构（combat-offline）— Wayfinder Map

## Destination

锁定「离线与挂机战斗（combat-offline）」模块的设计决策集，产出可直接交给 `/to-spec`、`/to-tickets` 的落地实现规格：
1. **挂机战斗离线暂停**：离线期间彻底停止战斗计算，体力按离线时长正常恢复；离线报告中剥离 `idleCombat` 战斗内容；重连时本地挂机状态保留并在在线 Tick 中继续。
2. **体力内核解耦**：体力恢复仅依赖时间流动，封装独立服务/纯函数接口（查询/尝试扣除/自然恢复），与其他业务逻辑彻底解耦。
3. **在线挂机连续战斗状态机**：确认战斗快照生成规则、体力不足等待恢复不停止、战败全员重伤自动停止等中断与循环契约。
4. **本地持久化与云端隔离**：挂机运行时数据（`combat.idle`）仅保存在本地 `localStorage`，云端同步（Supabase）时自动剔除/置空。
5. **ADR-0020 与领域模型维护**：立 ADR-0020 废止 ADR-0002 中的离线战斗推进决策，更新 `CONTEXT.md` 术语，严格限定暂停范围仅限挂机战斗，避免向避难所/温室/远征蔓延。

## Notes

- **领域**：AetherGarden 废土魔导温室放置游戏，战斗与离线子系统（`docs/combat/Offline.md`）。
- **交付形态**：设计决策集 + 可交付规格（不直接编写生产代码）。
- **严格范围界定**：
  - 仅「挂机战斗」在离线期间暂停；避难所发电机/回收站、温室作物生长/自动收割、远征派遣拾荒、体力自然恢复均**保持原有的离线推进**。
  - 挂机 UI 交互与视图展示由 `combat-ui` 负责，本 effort 仅定义挂机状态机、时间线与数据接口。
- **破坏性重构**：游戏未发布、无真实旧存档，不向后兼容；旧测试不符新功能一律删除（`docs/combat/readme.md`）。
- **既有基础**：快照生成与连续战斗逻辑、关卡结算节奏在 `levelCombat.ts` 已初步具备，本 effort 聚焦于收敛中断契约、离线剔除与体力解耦，严防改坏既有连续战斗逻辑。
- **技能**：决策票采用 `grilling`、`domain-modeling`、`codebase-design`；决策全部完成后交接给 `/to-spec` → `/to-tickets`。
- **关键文件**：`docs/combat/Offline.md`、`docs/combat/readme.md`、`docs/adr/0002-combat-model.md`、`CONTEXT.md`、`src/state/offline.ts`、`src/state/tick.ts`、`src/state/levelCombat.ts`、`src/state/combat.ts`、`src/data/combatConfig.ts`、`src/state/persistence.ts`、`src/components/CloudSyncWidget.tsx`、`src/App.tsx`。

## Decisions so far

<!-- the index — one line per closed ticket: enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [01 — 挂机战斗离线暂停与离线报告清理](issues/01-offline-combat-pause-and-report-cleanup.md) — 彻底移除 `calculateDetailedOfflineProgress` 战斗结算分支；`OfflineReport` 与 UI 移除 `idleCombat`；离线保留 `combat.idle` 供重连后在线继续；非战斗系统严格保留离线推进。
- [02 — 体力系统解耦与标准服务化 API](issues/02-stamina-system-decoupling-and-api.md) — 封装 `src/state/stamina.ts`，对外提供 `getStamina`、`recoverStaminaByTime`、`tryConsumeStamina`、`grantStamina` 纯函数服务接口；在线 Tick 与离线结算全链路统一收敛。
- [03 — 在线挂机连续战斗快照与中断状态机](issues/03-online-idle-snapshot-and-interruption.md) — 保持快照与连续战斗结算；确立缺体等待不终止、战败全员重伤自动停止置空、主动停止返回 summary 的状态机中断契约。
- [04 — 本地持久化与云端保存隔离规范](issues/04-persistence-and-cloud-sync-exclusion.md) — `sanitizeStateForCloud` 云端上传置空 `combat.idle`；本地 `localStorage` 完整保留；云端覆写前弹窗明确警示并需玩家确认。
- [05 — ADR-0020 与领域模型术语更新](issues/05-adr-0020-and-context-glossary.md) — 修订 `CONTEXT.md` 离线挂机词条；立项 ADR-0020 反转 ADR-0002 离线推进条款，确立体力解耦与存储隔离。

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

- 挂机战斗过程事件流（Event Stream）在在线 Tick 中的轻量化广播与 UI 消费协议（待 UI 对接时细化）。
- 长期挂机下日志队列长度与内存优化的微调方案。

## 🏁 地图完成

combat-offline 全部 5 张 tickets 已决议完毕，离线与挂机模块决策集完整，way 到 destination 已清晰，可直接交付 `/to-spec` 出规格 → `/to-tickets` 出实现票。

**Destination 达成**：
1. 挂机战斗离线暂停、在线持续循环推进；重连无缝继续；非战斗离线逻辑严格保全。
2. 体力内核解耦为 `src/state/stamina.ts` 标准纯函数服务。
3. 在线挂机连续战斗快照、缺体等待、战败重伤停止中断状态机收敛。
4. 本地存储 `combat.idle`、云端同步清洗置空、云端覆写二次确认。
5. ADR-0020《挂机战斗离线暂停与体力解耦》立项，`CONTEXT.md` 术语更新完毕。

## Out of scope

- **挂机 UI 组件与独立战斗页面实现** —— 由 `combat-ui` effort 覆盖。
- **避难所/温室/远征离线逻辑变更** —— 严格保持离线推进，禁止范围蔓延。
- **敌人与关卡数值平衡调整** —— 属于内容配置，不属于本机制 effort。
- **向后兼容旧存档数据** —— 本项目未上线，无历史存档负担。
