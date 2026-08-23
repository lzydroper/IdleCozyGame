# combat-config-json · 批次② 固定集合内容表批量迁移实施

> 来源：[blueprint.md](../../config-json-migration/blueprint.md) 批次②。转换方式：一次性 vitest 转换器程序化导出（icon 组件→kebab key），杜绝大表手抄错误；旧路径薄 shim 过渡（高扇出域消费方多，批次④统一收口删除）。

## 工单清单

| # | 域 | 产出 json | loader | shim | 状态 |
|---|---|---|---|---|---|
| 1 | items | consumables / resources / shards / equipmentItems | items.loader（四表合并 + iconFor 注入 + ITEM_CATEGORIES） | data/items/index.ts；types 迁 configs/types/item.types.ts（+iconKey 字段） | ✅ |
| 2 | workshop | recipes / autoRecipes | workshop.loader | data/recipes.ts、autoRecipes.ts | ✅ |
| 3 | shelter | facilities / shelterUpgrades（icon→iconKey） | shelter.loader（injectIcons） | data/facilities.ts（FacilityType/isFacilityType 留守）、shelterUpgrades.ts | ✅ |
| 4 | events | reality_按7类分文件 + dreamEvents + rescueEvents + rescueLocations(names+eventToLocation) + **realityOrder.json(顺序清单)** | event.loader（glob 归并 + authored 顺序重排） | realityEvents.ts（类型+CATEGORY_WEIGHTS→constants/eventWeights）、dreamEvents.ts、rescueEvents.ts、rescueLocations.ts | ✅ |
| 5 | progression | bonds / talentTrunks / growthByClass | progression.loader | bonds.ts（BondConfig 接口留守）、talents.ts（HERO_TALENTS 留守 + 构建函数移 state/talentsTree.ts）、heroGrowth.ts（公式移 state/heroGrowth.ts） | ✅ |

## 实施中的坑与修正（供后续批次引以为鉴）

1. **lucide 组件是 forwardRef 对象非函数**——typeof 检测漏判导致 `"icon": {}` 写进 json。修正：存在即处理，组件名取 displayName ?? name，缺失抛错。
2. **git show 管道恢复文件会 GBK 乱码**——必须用 `git checkout HEAD -- <path>` 字节级还原。
3. **glob 自碰撞**——`reality_order.json` 撞 `reality_*.json` 被当事件混入池。改名 `realityOrder.json` 规避；后续新增元数据文件命名须避开域内 glob 模式。
4. **事件池枚举序变化破坏确定性 rng 测试**——event.loader 按 realityOrder.json 重排归并结果，「路径透明」与行为稳定兼得。

## 遗留（已解决 ✅）

- ~~WildernessTab 两条用例 skip~~ **已修复**：根因是组件内按 id 排序打乱了 loader 经 realityOrder.json 保留的 authored 枚举序（rand=0 应命中首事件 ruined_truck，排序后落到 anomaly/酸雨卡）。撤除两处 `.sort()`、信任 loader 稳定序后 24/24 通过。经验：**路径透明原则下，顺序稳定性由 loader 单点保证，消费方不得再排序**。
