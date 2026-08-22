# 控制与中断语义拍板

Type: grilling
Status: resolved
Blocked by: 01

## Question

一簇影响战斗语义正确性的设计决策，需逐项拍板并写回 spec / `docs/combat/`：

- **眩晕递减口径**（Buff 清单 §3）：现状 turnStart 先结算递减再判 canAct，导致 duration=1 完全不跳、duration=2 只跳一回合——改为「先判定后递减」还是改在 turnEnd 递减？
- **时长归零中断码**（Buff §4）：继续复用 `negated` 还是新增 `zeroed`（与免疫区分）？
- **同源冲突中断码**（Buff §4）：不同 source 挂同种 Buff 的冲突，复用 `negated` 还是正式新增 `sourceConflict`？
- **canAct 汇总归属**（Turn #14）：Buff 模块提供统一 `canAct(ctx, unit)`（stun/封锁/机制汇总），`combat.ts` 只透传——确认边界与接口形状。
- **temporary「每目标每回合至多一次」**（Buff §2）：补运行时守卫还是维持约定？
- **免疫/嘲讽 flag 到期语义**（Effect #4，分诊新增）：`setFlag` 后永久存在、全仓无 removeFlag/clearFlag——改由 Buff 包装（进入 setFlag / 到期 clearFlag）还是给 flag 补独立到期机制？
- **canTrigger 接口形状**（Buff §2.3，分诊新增）：实现的 `canTriggerBuff(instance, trigger, timingKey, currentOwnerId)` vs spec 的效果级 `canTrigger(ctx, timingKey, currentOwnerId)`——定一后写回 spec。

**写回义务**：拍板结果写回 `.scratch/combat-buff/spec.md` 与 `docs/combat/Buff.md`；stun 由意志抵抗改为 durationReduction 的跨 effort 修订一并回写 `.scratch/combat-effect` spec（Buff §5.3）。

拍板结果需明确写回位置（`.scratch/combat-buff/spec.md`、`docs/combat/Buff.md` 等）。

## Answer

六项全部拍板（HITL grilling，D4 经一轮详释后由用户裁定）：

- **D1 眩晕递减口径 = 判定前置·快照制**：引擎把 `canActFn` 读数移到该单位 `settleTiming('turnStart')` 之前，先快照判定后递减；`duration=N` 严格跳过 N 个自身回合，本回合内判定不变。机制根源已核验（`turnEngine.ts:472-479`：现判定在 stun 触发器递减之后）。
- **D2 中断码 = 两个都加**：时长归零 → `'zeroed'`（自然到期，区别于免疫 `'negated'`）；不同 source 同种 Buff 冲突拒绝 → `'sourceConflict'`。
- **D3 canAct 归属 = 移入 Buff 模块 + 集合化**：`canActWithBuffs` 从 combat.ts 迁入 buffRuntime，改为遍历控制类集合（`CONTROL_KINDS = ['stun']` 起步），combat.ts 只透传给 `TurnConfig.canAct`。
- **D4 temporary 每回合一次 = 不加运行时守卫**（用户裁定）：维持 spec 约定，「同一 temporary Buff 配多个同回合可命中 Trigger」定为配置错误，靠评审与测试拦截。
- **D5 免疫/嘲讽 flag 到期 = 锁定「由 Buff 包装」方案 + 施工挂起**：immunity/taunt 效果落地为带 duration 的控制类 Buff（进入 setFlag / 到期 clearFlag）；不等内容牵引不施工（桶 D 触发），不开 Flag 独立递减的平行机制。
- **D6 canTrigger 形状 = 承认实现形状**：spec 写回为实例级四参 `canTriggerBuff(instance, trigger, timingKey, currentOwnerId)`，效果级三参草案废弃。

**写回已完成**：
1. `.scratch/combat-buff/spec.md` — §3 sourceConflict 定案；§4 canTrigger 实例级形状 + temporary 约定注记；§7 zeroed 编码、眩晕快照制口径与实现落点。
2. `.scratch/combat-effect/spec.md` — §4 二元抵抗清单移除 stun 的跨 effort 修订回写（含 zeroed）。
3. `docs/combat/Buff.md` — 眩晕条目语义澄清（严格 N 回合、快照判定、归零中断码）。

**产生的实施项**（决策已定、施工归实施桶）：canAct 快照前移（一行级）、CONTROL_KINDS 集合化迁移、zeroed/sourceConflict union 扩展、免疫/嘲讽 Buff 包装（挂起待内容触发）——前三项属桶 A 引擎收口，末项由路线图 06 号票定位。
