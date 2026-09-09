# combat-config-json · 批次① 管线验证实施

> 来源：[blueprint.md](../../config-json-migration/blueprint.md) 批次①。前置全局项随首票执行。

## 工单清单

| # | 内容 | 状态 |
|---|---|---|
| 0 | 前置全局：resolveJsonModule 开启；configs 骨架目录（loaders/constants 已建，types/mappings/seed 随后续工单落文件） | ✅ |
| 1 | loader 工具骨架：devGuard.ts（DEV 必填检查 + id 一致性）已落；glob 包装器延至批次③首个 glob 域实施时随用随建；integrity 测试样板 = farming.integrity.test.ts（五项检查参考实现） | ✅ |
| 2 | json 试点端到端：data/farming/crops.json + gameplay.loader（devGuard 出口）+ farming.integrity.test + 八个消费方 import 切换 + crops.ts 清除 | ✅ |
| 3 | constants 低扇出批：explorationConfig / summonConfig / nightmareConfig / heroLore 四文件归位 configs/constants（11 处引用面切换） | ✅ |
| 4 | constants 高扇出批：gameConstants / combatConfig / statConfig / uiConstants 纯移动（43 文件 import 面脚本重写）；workshopCategories 归位 + **iconKey 化首秀**（iconMap 初版登记 18 key + WorkshopCategoryBar 切 iconFor）；equipmentConstants / awakeningConstants / heroDisplay 三处抽取 + 源文件转发 shim（存量引用兼容，批次④终检统一收口） | ✅ |

> 实施记录：resolveJsonModule 已入 tsconfig.app.json；CropConfig 类型暂留 types/config.ts（全量 types 重分布归批次④终检统一评估）；farming.integrity.test 落位 configs/loaders/（保证 data/ 终态仅 json）。
>
> **批次① 完成标记**：constants 域清零达成——data/ 下不再有任何常量声明文件；剩余 .ts 均为内容表/实体/种子/选择器（批次②③④范围）。

> 工单 4 高扇出（uiConstants/statConfig/heroDisplay 组件引用面大），允许跨会话分次完成；每完成一项勾销并跑三绿。

## 验收口径

build + 全量测试 + oxlint 三绿；crops 与已迁常量数据源为 json/configs 且消费方仅改 import 路径。
