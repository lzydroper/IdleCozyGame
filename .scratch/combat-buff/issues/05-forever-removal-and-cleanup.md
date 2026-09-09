# 05 - forever 移除规则 + 移除清理契约

Type: task
Status: resolved
定段：Buff 模块移除路径；清理契约由 `ctx.removeBuff` 承担。

## 问题

forever 无回合递减，如何移除？移除 buff 时要清理哪些运行时资源？

## Answer

- 通用规则：**层数归零即移除**（无论 forever / temporary，只要有层数消耗语义）。
- forever 的移除路径：
  1. 驱散（dispel 效果）→ `ctx.removeBuff`；
  2. 效果显式结束 / 替换；
  3. **层数消耗归零**（如折焰：目标攻击后层数 −1，归零移除）。是否消耗层数由该 buff 的 Effect 逻辑决定（建议配置加 `consumeOnTrigger: boolean`，字段命名由 to-tickets 定）。
- **移除清理契约**（`ctx.removeBuff` 必须完成三件事）：
  1. 注销该 buff 在时机注册表的所有条目；
  2. 移除该 buff 持有的 Modifier（按 `Modifier.source` 反查其 modifierId 并 `removeModifier`）；
  3. 删除实例记录。
- 战意是清理契约的样板：每次重算前先移除 `source = 该 buff` 的 Modifier，再计算、再挂新 Modifier。

## Comments

由 Buff.md 讨论定案（用户采纳：层数归零即移除 + 注销注册 + 回收 Modifier）。