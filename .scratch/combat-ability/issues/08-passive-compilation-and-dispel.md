# 08 — 触发型被动编译与驱散

Type: grilling
Status: resolved
Blocked by: 03

## Question

触发型被动（如攻击吸血、反伤）如何编译到运行时，且是否可被驱散？

1. 被动 Ability 是否在战斗 setup（首个回合前）编译为 forever Buff + Trigger，注册到既有 Buff 层；被动 Ability 不进入主动选择？
2. `BuffConfig` 是否新增 `removable`（或等价）标记；`dispel` 是否只移除 removable Buff？
3. 被动生成的 forever Buff 是否默认 `removable: false`（不可驱散），避免天赋/觉醒被动被驱散？
4. 被动 Ability 的数值公式与 Effect 派发是否复用 03 的模板？

产出：被动 Ability 的编译契约 + Buff 层 `removable` 跨模块修订。
## Answer

（HITL grilling，用户在 chart 阶段已确认推荐方案）

- **D1 编译时点**：被动 Ability 在战斗 setup（首个回合前）编译为 forever Buff + Trigger，注册到既有 Buff 层；被动 Ability 不进入主动选择。
- **D2 removable 标记**：`BuffConfig` 新增 `removable?: boolean`（默认 true）；`dispel` 只移除 removable Buff。
- **D3 被动不可驱散**：被动生成的 forever Buff 设 `removable: false`，避免天赋/觉醒被动被驱散。
- **D4 复用模板**：被动 Ability 的数值公式与 Effect 派发复用 03 的公式/EffectTemplate。
