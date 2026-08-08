# 06 — 浇水维持生长

**What to build:** 浇水语义改为「维持生长」：作物浇水（湿润）后以基础 1x 速度生长；未湿润的作物停止生长（进度停滞、不倒退）；新播种的作物初始未湿润，需要浇水才开始生长；浇一次水湿润持续到该槽位收割重置。移除原有的「浇水生长速度 ×2」加速。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 在线 tick：未湿润作物 growthTimeLeft/growthProgress 不推进；湿润作物按 1x 推进
- [ ] 离线结算（含离线生长纯函数）与在线一致
- [ ] 播种后 isWatered=false；单槽/批量浇水置 true；收割后重置 false
- [ ] 湿润不再提供 ×2 加速；「有作物即活跃系统」判定保持（避免停滞期 lastTick 冻结导致浇水后跨期补扣生长时间）
- [ ] GreenhouseSlot.isWatered 类型注释更新为「湿润状态（维持生长）」
- [ ] 相关状态层测试更新；全量 `npx vitest run` + `npm run build` + `npm run lint` 绿
