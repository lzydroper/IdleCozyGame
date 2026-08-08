# 08 — 挂机区域机制

**What to build:** 驻守后可配置温室挂机：选择一种作物种子并开启后，自动持续收割成熟作物、免费给作物浇水、把空槽种上所选种子，直到种子耗光自动停止；离线期间同一循环照常结算，产出计入离线收益报告与日志。

**Blocked by:** 06, 07

**Status:** ready-for-agent

- [ ] `greenhouse.autoFarm = { enabled, cropId }` 字段（初始与存档合并默认 `{ enabled: false, cropId: null }`）
- [ ] 状态层 actions：选种（无前置，随时可存）；开启（必须已驻守，否则失败）；关闭（无前置）
- [ ] 解除驻守 → 自动 `enabled=false` 且保留 cropId
- [ ] 在线 tick 与离线结算按 `{ cropId }` 播种策略循环：收割成熟槽 → 免费浇水未湿润槽 → 播种空槽（复用 07 的播种策略接口）
- [ ] 种子种到最后一颗、种不完的空槽留空；种子耗光后 `enabled=false`
- [ ] 离线收益并入 recoveredItems + 日志
- [ ] 状态层测试（开启/关闭/选种/种子耗光停止/离线收益/解除驻守联动）；全量 `npx vitest run` + `npm run build` + `npm run lint` 绿
