# 天赋树树状重设计（原型）

Status: open
Type: prototype
Blocked by:

## Question

天赋树重设计（第 9 点，已确认：纵向主干 + 横向分支经典树形）：

1. `HeroTalentPanel` 从纵向列表改为树形布局：职阶主干节点纵向排列，英雄专属节点从对应主干节点横向分支展开，节点间画连接线（CSS/SVG）。
2. 数据层评估：现有 `talents.ts`（TALENT_TRUNKS + HERO_TALENTS，含 requires 前置）是否够用；是否需要为节点补充图标/分支位置等展示字段（数据驱动优先）。
3. 加点 / 撤点 / 重置交互保留；锁定、已满级、前置未解锁的状态表达在树形布局下如何呈现。
4. 界面尺寸：HeroDetailModal 内嵌弹窗（380px 宽）放得下树形布局的取舍（节点尺寸、缩进、横向分支数量上限）。

产出：原型实现（HeroTalentPanel 重写）+ 数据层扩展（如需）+ 测试。
