# 06 — 浇水维持生长

**What to build:** 浇水语义改为「维持生长」：作物浇水（湿润）后以基础 1x 速度生长；未湿润的作物停止生长（进度停滞、不倒退）；新播种的作物初始未湿润，需要浇水才开始生长；浇一次水湿润持续到该槽位收割重置。移除原有的「浇水生长速度 ×2」加速。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 在线 tick：未湿润作物 growthTimeLeft/growthProgress 不推进；湿润作物按 1x 推进（tick.test.ts 新增 2 测试）
- [x] 离线结算（含离线生长纯函数）与在线一致（GameContext.test.tsx 纯函数 3 测试 + 离线 3 测试）
- [x] 播种后 isWatered=false；单槽/批量浇水置 true；收割后重置 false（原有逻辑保持）
- [x] 湿润不再提供 ×2 加速；「有作物即活跃系统」判定保持（避免停滞期 lastTick 冻结导致浇水后跨期补扣生长时间）
- [x] GreenhouseSlot.isWatered 类型注释更新为「湿润状态（维持生长）」
- [x] 相关状态层测试更新；`npx tsc -b` 通过；全量 `npx vitest run` 除装备系统 3 个 baseline 既有失败（equipment.test.ts ×2、ItemDetailModal.test.tsx ×1，stash 验证与本次改动无关）外全绿

**注：** 驻守（isWateredOnline/isWateredOffline）强制湿润逻辑在 tick/offline 中保留原样，待 T07 正式化。
