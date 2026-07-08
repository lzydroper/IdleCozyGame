# 2026-07-08-tab-transition-fix-design

## 方案简述
针对用户提出的 Tab 切换时出现的不自然闪烁、高度挤压跳变（Layout Shift）以及原切换动画不够美观的问题，我们决定采用**方案一（瞬间隐藏旧 Tab + 原位优雅淡入新 Tab）**。

## 变更详情

### 1. 结构重构 (src/App.tsx)
将 `src/App.tsx` 的 `<main>` 容器中，原先通过 `max-h-[5000px]` 和 `transition-all` 进行高度折叠以实现切换的写法，替换为使用 Tailwind 的 `hidden` (即 `display: none`) 与内置过渡动画 `animate-tab-enter`。

**原代码结构：**
```tsx
<div className={`transition-all duration-300 ease-out overflow-hidden ${activeTab === 'wilderness' ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
  <WildernessTab />
</div>
```

**新代码结构：**
```tsx
<div className={activeTab === 'wilderness' ? 'block animate-tab-enter' : 'hidden'}>
  <WildernessTab />
</div>
```

此重构同样应用于 `dreamscape`, `workshop`, `log`, `shelter` 这几个 Tab。

### 2. 动画效果说明
- 隐藏的 Tab 容器会被立刻赋予 `hidden` 类。因此旧 Tab 瞬间脱离文档布局计算，**绝不产生排版推挤与元素位置跳变**。
- 显示的 Tab 会被立刻赋予 `block animate-tab-enter`，这会触发项目在 `src/index.css` 中已定义的 `tab-enter` 动画：
  ```css
  @keyframes tab-enter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  ```
  该动画将在 200ms 内流畅地淡入并从下方微弱上浮，符合现代应用顺畅、干净、利落的视觉质感。
- 由于只使用了 `hidden`，React 组件**将完全保持挂载状态**，不会引起任何 React 状态的丢失或生命周期的反复挂载。

## 验证计划
- **功能测试**：验证在切换各个 Tab 时，各 Tab 的生存数据、背包数据、离线状态、计时器等依然正常工作，不会丢失。
- **视觉验证**：在浏览器中观察跨越 Tab 切换时的表现，确保没有任何高度抖动与闪烁，淡入动画自然利落。
- **自动化测试**：运行 `npm run build` 和 `npx vitest run` 以确保没有破坏任何现有的测试用例与 TypeScript 类型检查。
