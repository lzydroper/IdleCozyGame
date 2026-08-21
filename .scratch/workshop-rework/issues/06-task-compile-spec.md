# 汇编工坊改造规范 spec

Type: task
Status: resolved
Blocked by:

## Question

所有决策 ticket（01-05）已解析，路线清晰。将决议汇编为《工坊模块改造规范》（`.scratch/workshop-rework/spec.md`，tracker 约定：spec 为 `<feature-slug>/spec.md`），作为实施交接物。

汇编要求（用 `to-spec` 技能）：

1. 章节覆盖：目的地/范围红线、数据模型（配方统一类型、去重与 id 迁移映射、分类字段推导、文案完全推导）、分类栏位（5 类+建筑、空态、data 配置）、批量合成（弹窗交互、maxBatch、特殊配方语义、原子批量接口）、架构（workshop 子目录组件清单、state/workshop.ts 纯函数、常量、Context 接口变更）、梦魇警报迁出（DreamLeakAlertPanel、App 横幅跳转）、补给面板删除改点、测试规划（组件/state/警报测试清单）、数据驱动检查（所有硬编码改 data/常量）。
2. 每章标注决议来源 ticket（名称链接），实施者可回溯。
3. 附"实施前需核对"清单：如自动侧重复 id 的完整迁移映射表、facility.ts/FacilityCard.tsx 的 input/output 迁移点。

前置：所有决议见 map「Decisions so far」（01-05 已解析）。

产出：`spec.md` 定稿，交用户审阅后作为实施 effort 的输入。

## Answer

（2026-08-06 执行）

《工坊模块改造规范》已汇编至 `.scratch/workshop-rework/spec.md`（Status: ready-for-agent），按 to-spec 模板覆盖：Problem Statement / Solution / User Stories（17 条）/ Implementation Decisions（8 节，含数据模型、去重与迁移、分类、可见性、批量合成、架构、警报迁出、补给删除）/ Testing Decisions（3 个已确认 seam）/ Out of Scope / Further Notes（含实施前核对清单与决议来源索引）。测试 seam 已与用户确认（state 纯函数 + UI 组件 + persistence 迁移三层）。

→ 全部 6 个 ticket 已解析，地图完成；spec 待用户审阅后进入实施 effort。

