# 01 挂机信息流单一生产者

Type: task
Status: resolved

## 内容

X1+X2 拍板落地：
1. 新模块 `src/state/idleFeed.ts`：模块级环形缓冲（容量 50）+ `pushIdleFeed` / `getIdleFeedSnapshot` / `subscribeIdleFeed` / `clearIdleFeed`（useSyncExternalStore 兼容：快照引用稳定）。
2. 生产者：levelCombat.settleLevelIdleUpdate 的 outcome 增加 `feedLines: string[]`——循环内用 formatBattleEvent/isDisplayableEvent 把每场真实事件流转为展示行；tick.ts 挂机段将行推入 feed，autoStop 时附系统行。
3. 消费者：IdleCombatWidget 删除内部 setInterval+simulateBattle 双重模拟与队列播放器，改 `useSyncExternalStore` 订阅 feed 尾部渲染；计时/统计/掉落徽章读 state.combat.idle。

## Answer（实施记录）

三项全部落地：idleFeed.ts 新建；LevelIdleSettlementOutcome.feedLines 由结算循环产出真实事件流展示行；tick.ts 推入 feed 并在 autoStop 时附系统行；IdleCombatWidget 重写为纯订阅消费者（不再 import simulateBattle/settleLevelBattle）。全量验收绿。

**补丁（用户反馈：事件行一次性出齐，丢失旧版步进观感）**：消费端补「视图侧步进播放器」——displayed 本地状态 + lastRenderedId 游标，新行按 `baseEventIntervalMs` 逐行放出；首挂载快进呈现尾部 3 行（历史不全量重放）；新一轮挂机开启时清空视图缓冲。生产者单点架构不变，节奏纯视图职责。

## 验收

- 全局 Tick 单点驱动；切 Tab 组件卸载后挂机推进与 feed 不停摆
- Widget 不再 import simulateBattle/settleLevelBattle
