# 02 — 战斗状态与掉落结算内核迁移（Expand）

**What to build:** 在现有战斗状态旁新增 Region/Level 状态与掉落结算内核，暂不切换界面。状态层新增按区域/关卡记录的通关与挂机字段，并提供按新掉落模型结算的纯函数：胜利时经验作为经验手册掉入背包（按三人总经验换算）、灵魂残响作为普通物品固定掉落、首通额外掉落只发一次。旧 zone 字段与旧结算路径保持可用，保证本轮全绿。

**Blocked by:** 01

**Status:** complete

- [x] 战斗状态可表达 clearedLevels（regionId → 已通关 local id 数组）、当前 regionId+levelId、挂机 regionId+levelId，且旧 zone 字段仍并存可用。
- [x] 新结算路径能按 regionId+levelId 启动普通战/关底战/挂机循环；关底就是区域末位关卡，其敌人含 role:'boss' 的特殊实例。
- [x] 掉落结算按三形态执行：经验手册数量 = max(1, round(expReward × 3 / 100))；灵魂残响为固定 soul_echo；firstClearDrops 仅首通发放；失败无掉落无经验，平局无奖励。
- [x] 通关记录正确写入 clearedLevels；区域通关 = 末位 local id 已在数组中。
- [x] 持久化加载时为新字段补默认值，不迁移旧 zone 字段；旧路径行为不变。
- [x] 新增状态与结算的单元测试绿；旧测试仍绿。
