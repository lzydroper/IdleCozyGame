# 迁移蓝图汇编

Type: task
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 07

## Question

汇总 01–05 号票产出，汇编「四批推进」工单级迁移蓝图（`blueprint.md`）：

- 批次① 管线验证：resolveJsonModule 开启、loader 骨架、常量域归位 configs、首个 json 试点端到端；
- 批次② 纯内容表批量迁移（按 01 号映射表逐域列票）；
- 批次③ 复杂域收尾（abilities 工厂切换、icon key 化切换、regions NN_ 重组织、events 域）；
- 批次④ 收尾：regionSelectors 移 state、seed 归位、data/*.ts 清零验收、测试面回归。

每批列出：目标、工单清单、依赖、验收口径。交付后交实施。

## Answer

终点交付物已落盘：**[blueprint.md](../blueprint.md)**。

- **前置全局项**：resolveJsonModule 开启 + types/game.ts FacilityType 切 configs/types；
- **批次① 管线验证**：configs 七夹骨架、types 七文件定型、constants 12 文件归位、devGuard+loader 骨架+integrity 样板、farming/crops.json 端到端试点；
- **批次② 固定集合批**：items 四表（iconMap 初版随行）/workshop 两表/shelter 两表（iconKey 化）/events 四表（CATEGORY_WEIGHTS 入 constants）/progression 三表 + 两处公式移 state；
- **批次③ 开放集合与复杂域**：abilities json×N + description 插值器、buff 数据驱动（三原子词表+materializer+createEffects 退役）、英雄 9×五文件拆分、enemies glob、regions NN_ 重组织 + regionSelectors 移 state;
- **批次④ 收尾**：seed 归位、测试迁移、data/*.ts 清零终检、AGENTS.md 架构描述同步。

每批含目标/工单清单/依赖/验收口径；批次①②③内部工单可并行，④收尾必须最后。各批 chart 起点已标注。
