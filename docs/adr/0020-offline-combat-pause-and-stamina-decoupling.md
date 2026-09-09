# 挂机战斗离线暂停与体力系统解耦

Status: accepted

## 背景

既有 ADR-0002 设定了"确认式离线挂机（离线期间推进战斗）"：玩家离线期间根据离线时长批量模拟战斗并消耗体力，重连时一次性结算掉落、经验与胜负报告。

随着战斗系统重构为深度回合制、能力/Buff 与快照驱动，原离线推进模式暴露出一系列设计与体验缺陷：
1. **体验与在线战斗割裂**：离线批量推算无法呈现技能、Buff 与事件过程；
2. **意外全灭与挫败感**：离线期间若遇到高难或随机不利，小队意外全灭导致全员重伤，玩家一上线就面临无法战斗的挫折；
3. **计算与状态冗余**：两套割裂的战斗推进与离线报告渲染链路增加了维护成本；
4. **体力逻辑散落**：体力自然恢复与消耗散落在 `combat.ts`, `levelCombat.ts`, `offline.ts`, `tick.ts` 等各处，缺乏统一定义。

`docs/combat/Offline.md` 明确调整挂机战斗语义为**离线暂停计算、在线持续循环推进**，并要求解耦体力系统。

## 决策

### 1. 挂机战斗离线暂停（反转 ADR-0002 离线推进条款）

- **离线暂停**：玩家离线时挂机战斗彻底**停止计算**，不产生离线战斗模拟、经验与掉落结算。`calculateDetailedOfflineProgress` 彻底移除战斗结算分支。
- **重连继续**：离线前若处于挂机中，本地 `combat.idle` 原样保留不变。玩家重新上线后，主循环 `applyTick` 自然检测到挂机激活，在后续在线 Tick 中无缝继续下一场战斗。
- **离线报告清理**：`OfflineReport` 彻底删除 `idleCombat` 字段，离线弹窗中移除挂机战斗报告区块，仅展示体力自然恢复量与避难所物资产出。

### 2. 严格限定范围，非战斗离线逻辑严格保全

- 离线暂停**仅作用于挂机战斗**。
- 避难所基建升级、发电机与回收站产出、工坊流水线加工、温室作物生长与自动收割、挂机远征派遣拾荒，以及**体力随时间的自然恢复**，全部严格保全既有的离线推进机制，禁止向非战斗领域蔓延。

### 3. 体力系统解耦与纯函数服务化

- 提炼独立模块 `src/state/stamina.ts`，统一收敛体力管理逻辑。
- 纯函数 API 契约：
  - `getStamina(state: GameState): number`：获取当前可用整型体力（`Math.floor(state.stamina || 0)`）。
  - `getMaxStamina(state: GameState): number`：获取体力上限（默认 `COMBAT_CONFIG.maxStamina`）。
  - `recoverStaminaByTime(state: GameState, elapsedSeconds: number): { state: GameState; recoveredInt: number }`：按时间流自然恢复体力（上限封顶），返回更新后状态与实际跨整点恢复的整数点数。
  - `tryConsumeStamina(state: GameState, cost: number): { ok: boolean; state: GameState }`：扣除体力，不足返回 `ok: false`。
  - `grantStamina(state: GameState, amount: number, allowOverflow = false): GameState`：道具/奖励回复体力。
- 在线 Tick（`tick.ts`）、离线结算（`offline.ts`）、关卡战斗（`levelCombat.ts`）与探索遭遇战斗全面改用上述 API，删除旧 `recoverStamina` 与散落算术。

### 4. 挂机数据本地独占持久化与云端隔离

- **本地存储（`localStorage`）**：`saveState` 完整保存 `combat.idle`，确保本地页面刷新、重启浏览器后挂机现场无损恢复。
- **云端上传过滤**：提供 `sanitizeStateForCloud(state: GameState): GameState`，在上传至 Supabase 前将 `combat.idle` 规范化置空为 `EMPTY_IDLE_STATE`，云端不保存挂机运行时数据。
- **云端下载覆写确认**：从云端拉取覆盖前，弹出二次确认模态窗明确警示“将丢失本地未上传进度并停止正在进行的挂机战斗”，经确认后重置挂机为未开启。
- **水合容错**：`mergeSavedState` 对损坏的 `combat.idle` 数据执行安全降级回退。

### 5. 废弃冗余配置与清理

- 废除 `COMBAT_CONFIG.maxIdleSettlementSeconds`（因离线不再跨数小时批量结算）。
- 废弃 `IdleCombatReport` 离线战报接口。

## Considered Options

- **继续维持离线推进，但降低战败惩罚**：无法解决离线与在线战斗引擎割裂的问题，依然需要两套结算代码。否决。
- **离线时按固定概率简化掉落公式**：简化公式与真实战斗数值（羁绊、装备、属性）脱节，违背数值统一原则。否决。
- **云端完整同步挂机时间戳并在多端继续**：极易产生跨端离线时长重叠与重复计算漏洞。否决，采用本地独占、云端置空的干净策略。

## Consequences

- 挂机战斗在线循环播放与主动战斗共享完全一致的快照实体创建、时机派发与掉落入账链路。
- 玩家离线期间体力正常恢复至上限，重新上线后体力充沛并自动继续挂机。
- 离线报告与 UI 结构精简清晰，消除离线意外全灭的挫败体验。
- 体力模块完全解耦独立，接口自内聚，易于编写单元测试。
