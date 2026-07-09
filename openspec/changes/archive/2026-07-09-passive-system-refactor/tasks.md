## 1. 创建被动修饰器系统

- [x] 1.1 创建 `src/systems/passiveModifiers.ts`，定义 `ModifierKey` 类型和 `getAdjustment` 函数
- [x] 1.2 重设计 `src/data/survivors.ts` 中的 `PassiveEffect` 接口为 `{ modifier, adjustment, operator, condition? }`
- [x] 1.3 迁移现有 6 个幸存者的被动数据至新格式
- [x] 1.4 为 `getAdjustment` 编写单元测试（`src/systems/passiveModifiers.test.ts`）

## 2. 替换消费端硬编码

- [x] 2.1 `GameContext.tsx`: 替换 `nova` 的 `max_energy` 硬编码为 `getAdjustment(state, 'max_energy')`
- [x] 2.2 `GameContext.tsx`: 替换 `mei` 的 `growth_speed` 硬编码为 `getAdjustment(state, 'growth_speed')`
- [x] 2.3 `WorkshopTab.tsx`: 替换 `nova` 的 `defense_cost` 硬编码为 `getAdjustment(state, 'defense_energy_cost')`
- [x] 2.4 `SwipeCard.tsx`: 替换 `catherine` 的 `stat_cost` 和 `buster` 的 `item_yield` 硬编码
- [x] 2.5 `WildernessTab.tsx`: 替换 `exploration_cost` 的 forEach 为 `getAdjustment`
- [x] 2.6 `WildernessTab.tsx`: 替换 `stat_cost` 和 `item_yield` 的 flatMap 为 `getAdjustment`

## 3. 添加新物品

- [x] 3.1 在 `src/data/items.ts` 添加 21 个新物品条目（9 种子 + 6 材料 + 6 补给）
- [x] 3.2 在 `src/data/items.ts` 添加 `void_core` 条目
- [x] 3.3 在 `src/components/GameIcon.tsx` 添加 22 个新物品的 ICON_CONFIG 映射

## 4. 添加新幸存者

- [x] 4.1 扩展 `SurvivorConfig.role` 和 `Survivor.role` 类型，加入 `'guard' | 'chemist' | 'scavenger'`
- [x] 4.2 在 `src/data/survivors.ts` 添加铁卫(soldier)、艾拉(healer)、小米(apprentice) 数据
- [x] 4.3 在 `src/components/GameIcon.tsx` 添加 3 个新幸存者的 ICON_CONFIG 映射
- [x] 4.4 更新各组件 role→中文标签（ShelterTab, FacilityCard, LogTab）

## 5. 验证

- [x] 5.1 运行 `npm run build` 确认无类型/编译错误
- [x] 5.2 运行 `npm run lint` 确认无 lint 错误（所有警告均为预先存在的，非本次改动引入）
- [x] 5.3 运行 `npx vitest run` 确认全部 42 个测试通过（9 文件）
