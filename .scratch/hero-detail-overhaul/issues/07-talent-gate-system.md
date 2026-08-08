# 天赋树通用门控（gate）系统——觉醒/等级/天赋点等条件列表解锁节点

Status: resolved
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

## Answer：实施完成（2026-08-07，TDD + code-review）

提交 `dbedfab`。

- **data/talents.ts**：`TalentGate` 联合类型（`talent`（节点投入，op 操作符）/ `awakened` / `heroLevel` / `star`）+ `TalentNodeConfig.gate?: TalentGate[]`（全部满足 AND 才可点；**只阻塞不画线**——独立竖线节点可写 gate 而不写 requires）+ `formatTalentGate(gate, nameOf)` 可读文案。
- **state/talents.ts**：`evaluateTalentGate`（AND 判定，空/无 gate 放行）、`firstUnmetTalentGate`（UI 标记/提示用）、`isTalentNodeUnlocked`（requires 与 gate 都满足）——`allocateTalentUpdate` 改用它。
- **HeroTalentPanel.tsx**：节点锁区分——gate 未满足显示**紫色觉醒锁**（awakened 型额外挂「觉醒」角标），前置未满足保持灰色普通锁；选中节点详情面板显示具体解锁条件（`formatTalentGate` 文案，如「英雄已觉醒」「角色等级 ≥10」「投入「X」≥1 点」）；顺手删除用户改版残留的未使用 `bonus` 变量。
- **测试**：talents.test +4 例（evaluateTalentGate 各条件边界/AND、isTalentNodeUnlocked 组合、allocateTalentUpdate 集成锁定）；HeroTab.test 适配用户界面改版文案（职阶星盘；移除已删的「英雄专属」「当前加成」断言）。
- **code-review 修复**：详情面板 talent 型 gate 文案改用 `formatTalentGate`（原错用 `selParents`，gate 的 nodeId 非 requires 父节点）。
- **验证**：全量 433/433、build 通过、lint 0 警告。

**使用示例**（后续配置新节点）：
```ts
{ id: 'hero_nova_awakened_skill', name: '觉醒·星爆',
  gate: [{ type: 'awakened' }, { type: 'heroLevel', minLevel: 10 }],
  // 不写 requires → 独立竖线；仅觉醒 + 等级 ≥10 可点
}
```

**互斥扩展（2026-08-07，用户要求）**：原 `talent` 条件的 `minLevel`（≥N）只能表达正向依赖，无法表达互斥（点了 A 分支就不能点 B 分支）。按用户选择改为 **operator 字段 + 直观单词操作符（严格 > / = / <，不缩写）**：
```ts
| { type: 'talent'; nodeId: string; operator: 'greater' | 'equal' | 'less'; value: number }
```
- 正向依赖：`{ type: 'talent', nodeId: 'A', operator: 'greater', value: 0 }`（整数点下投入 >0 即已投入，等价原 ≥1）
- **互斥**：`{ type: 'talent', nodeId: 'A', operator: 'equal', value: 0 }` —— A 未投入才解锁（文案渲染为「「A」未投入」）
- 上限：`less N`（整数点下 <N 等价 ≤N-1）；恰好：`equal N`（=N 点）
评估/文案 switch 加 `never` 穷尽断言（新增 operator 时编译报错）；新增 formatTalentGate 文案测试 + equal N>0 用例。提交 `3377f83`（初版 op/atLeast 方案，按澄清重写为 operator/greater-equal-less，最终提交 `10e8b21`）。

**已知边界（未处理）**：`unallocateTalentUpdate` 的 `has_dependents` 只检查 requires 下游，不检查 gate 中 talent 型依赖的下游——若未来需要「gate 依赖节点已投入时禁止撤销」，需扩展（本次按 YAGNI 跳过）。
