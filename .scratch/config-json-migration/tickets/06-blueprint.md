# 迁移蓝图汇编

Type: task
Status: open
Blocked by: 01, 02, 03, 04, 05, 07

## Question

汇总 01–05 号票产出，汇编「四批推进」工单级迁移蓝图（`blueprint.md`）：

- 批次① 管线验证：resolveJsonModule 开启、loader 骨架、常量域归位 configs、首个 json 试点端到端；
- 批次② 纯内容表批量迁移（按 01 号映射表逐域列票）；
- 批次③ 复杂域收尾（abilities 工厂切换、icon key 化切换、regions NN_ 重组织、events 域）；
- 批次④ 收尾：regionSelectors 移 state、seed 归位、data/*.ts 清零验收、测试面回归。

每批列出：目标、工单清单、依赖、验收口径。交付后交实施。
