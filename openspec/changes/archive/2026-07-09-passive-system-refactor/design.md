## Context

当前幸存者被动系统是"半数据驱动"状态——被动效果定义在 `src/data/survivors.ts` 的 `SurvivorConfig.passives` 数组中，但消费端代码没有统一的查询入口：

- `WildernessTab.tsx` 用 `forEach` 遍历 `SURVIVORS_CONFIG`，按 `type === 'exploration_cost'` 过滤
- `SwipeCard.tsx` 硬编码 `s.id === 'catherine'` 和 `s.id === 'buster'`
- `WorkshopTab.tsx` 硬编码 `s.id === 'nova'`
- `GameContext.tsx` 硬编码 `s.id === 'nova'` 和 `assignedWatererId === 'mei'`

这意味着每添加一个新幸存者，就必须在 N 个地方加 if-else。与"数据驱动"的设计目标背道而驰。

同时 sprise sheet 的 16 宫格已生成，但 `items.ts` 和 `GameIcon.tsx` 只映射了前 7-10 格，后半部分 21 个格子从未使用。

## Goals / Non-Goals

**Goals:**
- 创建 `src/systems/passiveModifiers.ts` — 独立的纯函数查询模块，不依赖 React 上下文
- 用细粒度 `ModifierKey` 替代现有的 `type + target` 组合
- 累加聚合逻辑：所有 `adjustment` 线性相加，`finalMultiplier = 1 + Σ(adjustments)`
- 迁移 6 个现有幸存者的被动数据至新格式
- 替换所有消费端的硬编码查询为 `getAdjustment(state, key)` 调用
- 添加 21 个新物品到 `ITEMS_CONFIG` 和 `ICON_CONFIG`
- 添加 3 个新幸存者到 `SURVIVORS_CONFIG`，扩展 `role` 类型

**Non-Goals:**
- 不涉及新幸存者的救援事件/梦境事件设计（后续分步实现）
- 不涉及新种子的作物定义（`crops.ts` 后续更新）
- 不涉及新材料的合成配方（`recipes.ts` 后续更新）
- 不涉及梦魇受伤倍率 `defense_damage_taken` 的底层实现（仅定义 key，接入留到后续）

## Decisions

### D1. ModifierKey 体系

采用细粒度字符串键，每个键对应一个可被修改的游戏参数：

```
exploration_food_cost     探索食物消耗 (mul)
exploration_energy_cost   探索魔能消耗 (mul)
craft_energy_cost         工坊制造能耗 (mul)
growth_speed              作物生长速度 (mul)
scavenge_interval         远征拾荒间隔 (mul)
defense_energy_cost       梦魇超频能耗 (mul)
defense_damage_taken      梦魇受伤倍率 (mul)
max_hp                    最大生命值 (add)
max_energy                最大魔能 (add)
stat_cost_hp              属性消耗-HP (mul)
stat_cost_food            属性消耗-饱食 (mul)
item_yield:<itemId>       指定物品产出倍率 (mul)
```

**替代方案考虑**:
- 保持 `type + target` 方案 → 被拒绝，因为消费端仍需双重判断
- 用 numeric enum → 被拒绝，与 `erasableSyntaxOnly` 冲突
- 用 Symbol → 被拒绝，JSON 序列化困难，不利于测试

### D2. getAdjustment 纯函数

```
function getAdjustment(state: GameState, key: ModifierKey): number
```

- 遍历 `state.survivors` 中所有已救出幸存者
- 查找 `SURVIVORS_CONFIG` 中对应的 `passives`
- 匹配 `p.modifier === key` 的条目
- `operator === 'add'` → `total += p.adjustment`
- `operator === 'mul'` → `total += p.adjustment` (对 1 的偏差)
- 返回 `total`

消费端使用模式:
```typescript
// mul: cost = Math.round(base * (1 + getAdjustment(state, 'exploration_food_cost')))
// add: maxHp = baseMaxHp + getAdjustment(state, 'max_hp')
```

**替代方案考虑**:
- 放在 GameContext 作为 hook → 被拒绝，避免继续臃肿 GameContext
- 放在 utils 目录 → 选择 `src/systems/` 以明确这是游戏逻辑系统而非工具函数

### D3. PassiveEffect 接口重设计

从:
```typescript
{ type: 'exploration_cost', target: 'food', multiplier: 0.85 }
```

到:
```typescript
{ modifier: 'exploration_food_cost', adjustment: -0.15, operator: 'mul' }
```

**迁移映射**:
| 当前 | 新 |
|---|---|
| `{ type:'exploration_cost', target:'energy', multiplier:0.85 }` | `{ modifier:'exploration_energy_cost', adjustment:-0.15, operator:'mul' }` |
| `{ type:'exploration_cost', target:'food', multiplier:0.85 }` | `{ modifier:'exploration_food_cost', adjustment:-0.15, operator:'mul' }` |
| `{ type:'stat_cost', target:'hp/food', multiplier:0.85 }` | `[{ modifier:'stat_cost_hp', adjustment:-0.15, operator:'mul' }, { modifier:'stat_cost_food', adjustment:-0.15, operator:'mul' }]` |
| `{ type:'item_yield', target:'scrap_metal', multiplier:1.3 }` | `{ modifier:'item_yield:scrap_metal', adjustment:0.3, operator:'mul' }` |
| `{ type:'max_energy', flatBonus:30 }` | `{ modifier:'max_energy', adjustment:30, operator:'add' }` |
| `{ type:'craft_energy', multiplier:0.8 }` | `{ modifier:'craft_energy_cost', adjustment:-0.2, operator:'mul' }` |
| `{ type:'growth_speed', multiplier:1.25 }` | `{ modifier:'growth_speed', adjustment:0.25, operator:'mul' }` |
| `{ type:'defense_cost', multiplier:0.5 }` | `{ modifier:'defense_energy_cost', adjustment:-0.5, operator:'mul' }` |

### D4. 新幸存者数据

所有 survivor 的 `realityLocationId` 暂时指向 placeholder 地点（不设置 scavengeInterval/lootTable），救援事件后续实现。

## Risks / Trade-offs

- **[迁移风险]** 现有 6 个幸存者的被动硬编码分散在 5 个文件中，替换过程中可能遗漏 → 按文件逐一替换，每完成一个文件跑测试验证
- **[设计风险]** `scavenge_interval` 和 `defense_damage_taken` 目前无消费端实现，定义了 key 但不会被实际读取 → 接受，属后续步骤
- **[兼容风险]** `condition: 'assigned'` 字段保留，但新系统暂不处理（当前只有 Mei 用到 `assigned`） → 保留字段，在 getAdjustment 中暂只检查 `rescued`，`assigned` 逻辑后续扩展
