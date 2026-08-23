# 全量归位映射表定稿

Type: task
Status: resolved

## Question

盘点现存 31 个 `src/data/*.ts`，逐文件产出归位映射表（`mapping.md`），作为蓝图与全部实施票的工作底稿。每文件记录：

1. **目标归属**：data 下精确 json 路径（含破坏性新命名）或 configs 下精确 ts 路径；
2. **拆分方案**：按「实体细粒度」与「玩法子系统」四原则的落位（如 talents.ts 拆全局树 vs 英雄 talent.json 的边界）；
3. **污染处置**：函数/LucideIcon/运行时逻辑的出口（factory/mappings/state 迁移目标）；
4. **引用面**：哪些 state/组件/测试 import 它（迁移波及清单）。

## Answer

交付物：[mapping.md](../mapping.md)。实际盘面 37 文件（items/ 子夹 6 个此前未计入）+4 测试。

- **A 表**：20 个内容文件 → data 六域 json（含英雄 per-hero 拆分示范、awakening/talents/heroGrowth 三处「一拆二」、items/props→consumables 等破坏性重命名）；
- **B 表**：13 个常量/类型/种子文件 → configs/constants|types|seed；
- **C 表**：regionSelectors / talents 构建函数 / heroGrowth 公式三处迁 src/state/；
- **D 表**：五条破坏性重命名对照；**E 表**：测试去向；**F 节**：留给 02–05 号票的四个细化开口。

关键发现：awakening/talents/heroGrowth 均为「共享常量表 + per-hero 数据 + 公式函数」三位一体，全部按「常量→configs、per-hero→英雄文件夹、公式→state」三分；equipment 与 items/equipment 是两套不同系统，命名已区分。

四原则已锁（见 map Notes）；本票产出 = 原则到 31 文件的一一落地 + 命名对照表。
