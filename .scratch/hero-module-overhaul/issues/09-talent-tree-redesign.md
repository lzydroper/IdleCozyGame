# 天赋树树状重设计（原型）

Status: resolved
Type: prototype
Blocked by:

## Question

天赋树重设计（第 9 点，已确认：纵向主干 + 横向分支经典树形）：

1. `HeroTalentPanel` 从纵向列表改为树形布局：职阶主干节点纵向排列，英雄专属节点从对应主干节点横向分支展开，节点间画连接线（CSS/SVG）。
2. 数据层评估：现有 `talents.ts`（TALENT_TRUNKS + HERO_TALENTS，含 requires 前置）是否够用；是否需要为节点补充图标/分支位置等展示字段（数据驱动优先）。
3. 加点 / 撤点 / 重置交互保留；锁定、已满级、前置未解锁的状态表达在树形布局下如何呈现。
4. 界面尺寸：HeroDetailModal 内嵌弹窗（380px 宽）放得下树形布局的取舍（节点尺寸、缩进、横向分支数量上限）。

## Answer（最终版，2026-08-07 修订）

### 原型过程（按 prototype skill 重做）
- 首版直接改生产代码、单变体 —— 不符合 prototype 规范，已回滚 `HeroTalentPanel.tsx` 至原状。
- 重做：三个结构不同的变体（A 横向树 / B 技能网图 / C 缩进树）挂载在天赋弹窗，`?variant=A|B|C` 切换 + 浮动底栏（仅 vite dev 显示）。
- **用户选定 B（技能网图）并给出细化规格**：直线连线（非曲线）；每节点只有左下/正下/右下三个子方向；同一父节点的子节点同一水平线；选中节点下方显示描述/增益；数据配置含相对坐标与子节点列表；按子节点数定槽位（1=正下、2=左下右下、3=左下正下右下）；子节点被父节点阻塞（父已投入点数 ≥1 才可升级）但可查看信息。
- 未采用的变体（A/C）与原型脚手架归档于 `.scratch/hero-module-overhaul/prototype-archive/`（primary source），主代码路径已清除。

### 正式实现（折入 winner）
- **数据层 `src/data/talents.ts`**：
  - `TalentNodeConfig` 增加 `pos: { row, col }`（相对坐标：row 行、col 行内序号 0 起）与 `children?: string[]`（子节点列表）；`requires` 保留（阻塞来源，兼容逻辑与旧测试）。
  - 3 职阶主干 + 9 英雄专属节点全部配置 pos；新增 `buildTalentTree(heroId)` 组装完整树并把专属节点挂到 `requires` 父节点 children 末尾（主干链子在前）。
- **布局引擎（`HeroTalentPanel.tsx`）**：以根为锚递归，子节点按数量取槽位偏移（1→[0]、2→[-1,1]、3→[-1,0,1]），`y = row * ROW_H`（同父节点子节点同一水平线）；SVG `<line>` 直线自动连线；整体平移到非负。
- **交互**：点击节点选中（默认选中根）；选中节点下方信息面板显示描述、每级增益、等级/最大、+/− 按钮；子节点被父节点阻塞时 + 禁用并提示「父节点已投入 N 点，需 ≥1 点」，锁定节点仍可查看信息（opacity + 锁标）；等级角标、当前加成汇总、重置、天赋点保留。

### 验证
- `npx vitest run` 全量 → **411 passed / 40 files**（新增 buildTalentTree 组装测试 2 例；HeroTab 加点/重置测试保持通过）。
- `npm run build`（tsc -b && vite build）→ 通过。
- `npx oxlint`（HeroTalentPanel / talents.ts / talents.test.ts）→ 0 警告（HeroDetailModal 的 3 条 pre-existing lint 留 13/12）。

### 说明
- 布局为**数据驱动**：新增节点只需在 talents.ts 配置 pos + children + requires，渲染自动排布与连线。
- 阻塞规则 = 父节点已投入点数（`getTalentLevel(hero, parentId) >= 1`），与 state/talents.ts 的 `prereqsMet` 一致。
