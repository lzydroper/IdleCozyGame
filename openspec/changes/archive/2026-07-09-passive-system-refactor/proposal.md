## Why

游戏当前的幸存者被动技能系统是"数据驱动 + 硬编码查询"的混合体——被动效果定义在 `survivors.ts` 的数据中，但消费端用 `if (id === 'nova')`、`if (id === 'mei')` 等硬编码来读取，导致每添加一个新幸存者就要改多处 if-else 分支。同时 sprite sheet（雪碧图）的 16 宫格只填了前 7-10 格，后半部分空置的图标格子从未在游戏中使用。

本次重构将被动改为**中心化修饰器系统**，彻底消除硬编码，同时利用数据驱动的便利性一次性将填满 sprite sheet 所需的物品和幸存者添加进游戏。

## What Changes

- **BREAKING**: `PassiveEffect` 接口重设计 — 从 `{ type, target, multiplier }` 改为 `{ modifier, adjustment, operator }`，用细粒度 `ModifierKey` 替代类型+目标组合
- **BREAKING**: 现有 6 个幸存者的被动数据迁移至新格式
- **新增**: `src/systems/passiveModifiers.ts` — 独立的被动修饰器查询模块，提供 `getAdjustment(state, key)` 纯函数
- **移除**: 所有硬编码被动查询（`GameContext.tsx` 的 `nova`/`mei` 检查、`SwipeCard.tsx` 的 `catherine`/`buster` 检查、`WorkshopTab.tsx` 的 `nova` 检查、`WildernessTab.tsx` 的 forEach+type 过滤）
- **新增**: 21 个新物品条目（9 种子 + 6 材料 + 6 补给），填满 spritesheet 16 宫格
- **新增**: 3 个新幸存者（铁卫/soldier、艾拉/healer、小米/apprentice），扩展 `role` 联合类型
- **新增**: 新被动类型 `max_hp`、`scavenge_interval`，以及 `item_yield:<itemId>` 模板键

## Capabilities

### New Capabilities
- `passive-modifiers`: 中心化被动修饰器查询系统，定义 ModifierKey 枚举和 getAdjustment 纯函数
- `new-icon-items`: 将 spritesheet 剩余格子对应的 21 个物品注册到 ITEMS_CONFIG + ICON_CONFIG
- `new-survivors`: 3 个新幸存者的数据定义、角色类型扩展、基础被动设计

### Modified Capabilities
- *(no existing specs to modify)*

## Impact

- `src/data/survivors.ts` — PassiveEffect 接口破坏性变更; role 类型扩展; 9 个幸存者数据
- `src/data/items.ts` — 新增 21 个物品条目
- `src/components/GameIcon.tsx` — ICON_CONFIG 新增 24 个映射
- `src/types/game.ts` — Survivor.role 类型扩展
- `src/systems/passiveModifiers.ts` — 新文件
- `src/components/WildernessTab.tsx` — 移除 forEach+type 过滤，改用 getAdjustment
- `src/components/SwipeCard.tsx` — 移除硬编码 catherine/buster 查询
- `src/components/WorkshopTab.tsx` — 移除硬编码 nova 查询
- `src/context/GameContext.tsx` — 移除硬编码 nova/mei 查询
- `src/components/FacilityCard.tsx` — 角色职业显示更新
- `src/components/ShelterTab.tsx` — 角色职业显示更新
- `src/components/LogTab.tsx` — 角色职业显示更新
