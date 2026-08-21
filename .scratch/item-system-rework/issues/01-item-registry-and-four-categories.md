# 01 — 物品注册表单一真相源与四分类落地

**What to build:** 物品的定义收拢到单一注册表（元数据与图标内聚），分类收敛为道具/资源/碎片/装备四类并按 spec 映射表重新归类，背包分类切页直接绑定新枚举；装备物品条目由装备配置派生；图标渲染改读注册表；清理装饰图标、未引用贴图与死字段；数据一致性测试兜底配置腐坏。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 物品定义重组为四类分域组织 + 聚合导出注册表；新增物品只需在一处配置（元数据 + 图标索引内聚）
- [x] 物品分类枚举收敛为四值（道具/资源/碎片/装备）；spec 映射表全部条目按新分类落地，含新增物品定义：`soul_echo`（灵魂残响）、`resonance_shard`（共鸣碎片）、`shard_<heroId>`（9 位英雄专属灵魂碎片）
- [x] 背包分类切页为「道具/资源/碎片/装备」四 tab，直接绑定枚举，无匹配函数；原「消耗品/材料」tab 消失；种子归资源、梦境碎片归资源、能量补充剂等消耗品不再混入装备页
- [x] 12 件系列装备条目的名称/描述/分类由装备配置派生，物品定义中无重复
- [x] 物品图标按物品定义渲染（sprite 优先、Lucide 回退），渲染结果与重构前一致，无新增「sprite 待补」标记
- [x] 数据一致性测试通过：无孤儿 id、sprite 索引无冲突、category 均为合法枚举、装备派生与装备配置一致
- [x] 清理落地：魔能储备装饰图标不再占用物品图标注册表（由所在界面直接渲染 Lucide）；未引用贴图 `spritesheet_items.png` 已删除；死字段 `discoveredBlueprints` 已删除
- [x] 相关组件/数据测试更新，`npx vitest run`、`npm run build`、`npm run lint` 全绿

## Answer

已在分支 `hero-ehco` 完成（commit `07798b4`），全量 324 测试通过、tsc/vite build 绿、oxlint 与基线一致（4 错误 7 警告均为基线遗留，零新增）。

**实施要点**：
- 新建 `src/data/items/` 分域目录（types/props/resources/shards/equipment/index），76 条物品定义按四分类分域，sprite 索引并入 `ItemMeta`，import 路径 `../data/items` 兼容承接；
- 装备 12 件由 `EQUIPMENT_CONFIG` 派生（name/description/category 单一真相源）；
- `GameIcon` 删除 `ICON_CONFIG` 改读物品/英雄配置（英雄立绘 sprite 迁入 `HEROES_CONFIG`）；`iconMaps.ts` 仅剩敌人/区域/槽位映射；
- `LogTab` 四分类 tab 直接绑定 `ItemCategory` 枚举；
- 新增 `registry.test.ts` 9 例（分类分布 15/35/11/14、装备派生一致、sprite 白名单、图标兜底）；`LogTab.test.tsx` 6 例（含消耗品不混装备页、种子/梦境碎片归资源）；
- 清理：`energy_cell` 剥离、`spritesheet_items.png`、`discoveredBlueprints` 死字段；
- 说明：spec 映射表标题「碎片 12 项」系笔误，实际 1+1+9=11 项，实现按实际执行。
