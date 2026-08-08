# 天赋树通用门控（gate）系统——觉醒/等级/天赋点等条件列表解锁节点

Status: claimed
Type: task
Blocked by:

## Question

用户需求：天赋节点解锁条件需要**丰富的布尔判断列表**（多个条件全部满足才可点），例如「某天赋节点已投入 ≥1 点」「英雄已觉醒」「角色等级 >10」等。现状 `requires` 只支持"前置节点投入 ≥1 点"一种阻塞，无法表达觉醒/等级等状态。

设计（用户确认）：

1. **通用门控 `gate?: TalentGate[]`**（数据驱动，与现有模式一致）：一组条件，**全部满足（AND）才解锁**；只阻塞、不画线（与 `requires` 的画线语义解耦——独立竖线 + 前置解锁可由此实现）。
   ```ts
   type TalentGate =
     | { type: 'talent'; nodeId: string; minLevel?: number }  // 某天赋节点投入 ≥ minLevel（默认 1）
     | { type: 'awakened' }                                   // 英雄已觉醒
     | { type: 'heroLevel'; minLevel: number }                // 角色等级 ≥ minLevel
     | { type: 'star'; minLevel: number };                    // 星级 ≥ minLevel（预留）
   ```
2. **解锁判定**：`requires`（现有）与 `gate`（新增）**AND**——都满足才可加点。
3. **UI**：未觉醒等 gate 未满足时，节点显示**特殊锁 + 觉醒标记**（区分于普通前置锁）；选中节点详情面板显示 gate 条件的可读文案（"需觉醒 / 角色等级 ≥10 / 投入「锋芒毕露」≥1 点"）。

实施点：

- `src/data/talents.ts`：`TalentGate` 类型 + `TalentNodeConfig.gate` 字段 + `formatTalentGate`（可读文案，需节点名解析）。
- `src/state/talents.ts`：`evaluateTalentGate` 纯函数 + 解锁判定合并（`prereqsMet && evaluateTalentGate`）接入 `allocateTalentUpdate`。
- `src/components/HeroTalentPanel.tsx`：locked 计算合并 gate + 锁类型区分（觉醒锁特殊样式 + 标记）+ 详情面板 gate 文案。
- 测试：`talents.test.ts` 新增 `evaluateTalentGate` 纯函数用例 + `allocateTalentUpdate` gate 锁定用例（TDD 红绿）。
- 现有节点配置**不迁移**（requires 保留兼容），新节点可直接写 `gate`。

范围外：unallocate 的 has_dependents 是否考虑 gate 的 talent 依赖（边界场景，本次不处理，Answer 注明）；gate 的节点名解析依赖 buildTalentTree 的节点列表。
