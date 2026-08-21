# 招募界面清理：冗余按钮 / 旋转动画 / tips 统一

Status: resolved
Type: task
Blocked by:

## Question

招募界面（SummonTab.tsx）三处清理，不依赖图标系统：

1. 删除与「招募概率与规则」重复的「查看招募概率」按钮（顶部 `Info` 按钮保留为唯一入口，`HelpCircle` 大按钮删除）。
2. 删除招募结果标题中 `Sparkles` 图标的旋转动画（`animate-spin`）。
3. 将自定义 `infoToastMessage` 提示改为使用 `ToastSystem` 的 `showToast`（样式、大小与外部完全统一；颜色沿用 info 默认或按类型区分）。

产出：SummonTab.tsx 的修改 + 相关测试更新（SummonTab.test.tsx）。

## Answer

（本 session 实施，2026-08-07）

1. **删除「查看招募概率」按钮**：移除中央右侧的 HelpCircle 大按钮（原 title="查看招募概率"）；规则入口唯一化为顶部 Info 按钮（title="招募概率与规则"）。保底进度卡片改为独占右侧布局。
2. **删除旋转动画**：招募结果标题的 `<Sparkles className="... animate-spin">` 移除 `animate-spin`。
3. **tips 统一到 ToastSystem**：删除自定义 `infoToastMessage` state 与渲染块（absolute top-16 琥珀提示）；全部迁移到 `showToast`：
   - 单抽/十连余额不足 → `showToast(..., 'warning')`（琥珀色，与外部 warning 一致）
   - 「切换」卡池提示 → `showToast(..., 'info')`（注：切换按钮本身仍为 mock，真正的 10/100 抽切换由 06 号 ticket 实现）
   - 「秘宝古卜」→ `showToast(..., 'info')`
   - `useToast` import 已加。

### 验证
- `npx vitest run src/components/SummonTab.test.tsx` → 7 passed（含 rules modal 打开/关闭、余额不足 toast 断言——toast 文本经 ToastSystem 渲染，`getByText` 仍可命中）。
- `npx tsc -b` → 通过。
- `npx oxlint src/components/SummonTab.tsx` → 0 warnings / 0 errors。

