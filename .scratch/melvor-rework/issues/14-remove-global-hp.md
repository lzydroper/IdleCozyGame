# 14 — 废除全局 HP 收尾

**What to build:** 移除玩家全局生命值体系：`PlayerStats` 不再含 HP；梦魇泄露改为出战当前小队防御（炮塔保留为开战前辅助输出一轮），失败 → 小队全员重伤 + **梦境封锁**（梦境探索禁用，时长可配置）；手动探索保留魔能/食物消耗；探索死亡惩罚移除（战利品永不因失败丢失）；纳米修复剂语义改为治愈重伤（与 05 配合）。

**Blocked by:** 04 — 退役被动系统与职阶迁移; 05 — 战斗核心：三人轮询回合制; 06 — 荒野双模式与探索战斗汇合.

**Status:** resolved

- [x] 全局 `hp/maxHP` 及其消耗/惩罚逻辑全部移除，存档迁移兼容
- [x] 梦魇泄露出战小队防御，炮塔先输出一轮再进战斗
- [x] 泄露失败 → 全员重伤 + 梦境封锁（时长可配置），封锁期间梦境不可进入
- [x] 探索战败不再清空战利品，手动探索仅消耗魔能/食物
- [x] 纳米修复剂只承担治愈重伤用途

## Answer

- 类型/数据：`PlayerStats` 移除 `hp/maxHp`；`ItemMeta.useEffect.stats` 与 `EventChoice.results.stats` 移除 `hp` 键；`hot_stew/ration_deluxe/stimpack` 效果去掉生命项，`nanite_injector` 改为"治愈重伤"专用道具（英雄面板消耗）；全部现实探索/救援事件的 HP 消耗与文本移除（保留魔能/食物/理智消耗）。
- 梦魇泄露（`src/state/nightmare.ts`）：`defendDreamLeakUpdate` 出战当前小队（轮询战斗复用 `simulateBattle`），炮塔可选开战前输出 `turretDamage`（可直接击杀）；胜利 → 警报清除、虚空核心入账、污染归零、小队战后修整回满血；失败（全灭）→ 全员重伤 + `dreamLockdownUntil`（`NIGHTMARE_CONFIG.dreamLockdownDuration`，30 分钟），警报保留可再战；无小队/重伤/无炮塔/无警报均拒绝并提示。
- 梦境封锁：`exploration.dreamLockdownUntil` 时间戳；`DreamscapeTab` 封锁期间禁用入梦（按钮禁用 + 红色横幅 + 剩余分钟），到期自动解除。
- 探索：`WildernessTab` 移除死亡判定与"清空战利品"惩罚——事件永不致死，临时背囊永不丢失；手动探索仅扣魔能/食物。
- 云同步与 UI：角色摘要与本地预览移除 `hp` 字段；`App.tsx` 属性栏 HP 条删除（4 列 → 3 列）。
- 迁移：`mergeSavedState` 剥离旧存档残留的 `player.hp/maxHp`，`dreamLockdownUntil` 缺省回退 `null`。
- 测试：新增 `src/state/nightmare.test.ts` 8 项（胜利/炮塔辅助与直接击杀/失败重伤+封锁/到期解除/拒绝路径/迁移），重写 WildernessTab/expansion/Account 相关断言；全量 261 项通过，`tsc -b` 与 `vite build` 通过，lint 持平基线。
