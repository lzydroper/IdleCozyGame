# 06 Offline 守卫

Status: resolved

## 内容

> **实施记录**：① O#3 落地——`MAX_IDLE_BATTLES_PER_TICK = 10` 截断单 Tick 批量模拟，截断场次时间经 accumulatedSeconds 滚回后续 Tick（含专项测试）；② O#4 **核验为既有实现**：全部 logs 写入点已有 `.slice(0, 100)` 滑窗（combat.ts:390/409、levelCombat.ts:386、logs.ts:8、tick.ts 五处），Offline 清单该条系陈旧记载，无需施工；③ O#8 落地——`resolveEncounterBattleUpdate` 新增 `idle_active` 失败码拦截挂机中遭遇战（状态层单向守卫；探索侧无持久化状态，反向由既有 UI 标签页互斥覆盖），含测试。
>
> 注：`idle_active` 为新增失败码，WildernessTab 的失败提示分支如需友好文案，归批次④ combat-experience 顺带处理。

决策依据：triage O#3/O#4/O#8（R3 裁定并入本批）。独立于战斗引擎，可随时插队实施。

1. **单 Tick 挂机结算上限**（O#3）：settleLevelIdleUpdate 增加「单次 Tick 最多结算 N 场/秒」上限（默认值实现时定并注明），防瞬间大量体力导致的批量突发
2. **logs 滑动窗口**（O#4）：本地挂机日志保留最新 ~100 条（写入处裁剪），防 localStorage 膨胀
3. **探索/挂机互斥守卫**（O#8）：state 层建立互斥守卫（挂机中拒绝探索扣体、反之亦然），不再仅依赖 UI 标签页互斥

## 验收

- 三项各有单测；GameContext tick 相关既有测试不回归
