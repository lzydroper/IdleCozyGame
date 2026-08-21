# 05 — 主动 Ability 选择算法与兜底

Type: grilling
Status: resolved
Blocked by: 03, 04, 06, 07

## Question

单位在「回合进行中」如何选能力与执行？

1. 过滤条件是否 = 冷却 0、cost 可付、targeting 至少 1 个有效目标？
2. 排序键是否 = priority 降序 + 配置顺序升序？
3. 先扣费、写冷却，再派发 effects；若无可选主动 Ability，是否回落 `basic_attack`；`basic_attack` 也无目标则本回合 no-op？
4. `basic_attack` 是否作为显式 `basic_attack` AbilityConfig，在装配时追加给每个单位（含敌人），executor 仅保留防御性兜底？

产出：选能力/执行的标准算法。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 过滤**：可选主动 Ability = 冷却 0 且 cost 可付且 targeting 至少 1 个有效目标。
- **D2 排序**：priority 降序，再按配置/列表顺序升序；确定性全序。
- **D3 执行顺序**：目标校验 → 扣费 → 写冷却 → 派发 effects；无可选主动 Ability → 回落 `basic_attack`；`basic_attack` 也无目标 → 本回合 no-op。
- **D4 basic_attack**：显式 `basic_attack` AbilityConfig，装配时追加给每个单位（含敌人）；executor 仅保留防御性兜底。
