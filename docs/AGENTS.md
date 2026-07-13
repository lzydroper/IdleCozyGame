# AetherGarden — Agent Guide (AI 辅助开发规范指南)

本指南旨在为接入《AetherGarden》项目的 AI 开发助手提供核心的开发规范与代码防错准则。在进行任何代码修改或功能迭代前，AI 必须严格遵守以下约定。

---

## 1. 常用开发命令

| 命令 | 动作与用途 |
| :--- | :--- |
| `npm run dev` | 启动本地 Vite 开发服务器（端口：5173） |
| `npm run build` | 执行打包。会先运行 `tsc -b` 进行严格类型校验，再执行 `vite build` 编译，顺序不可颠倒 |
| `npm run lint` | 运行 `oxlint` 静态代码检查（本项目未配置 ESLint，依赖 Oxlint 毫秒级静态检查） |
| `npx vitest run` | 运行项目中的全部单元测试 |
| `npx vitest run src/components/WorkshopTab.test.tsx` | 针对单个组件测试文件进行测试 |

---

## 2. TypeScript 严格校验规范 (`tsconfig.app.json`)

为了避免在频繁的代码重构和智能代码生成中引入隐蔽的编译错误，本项目开启了极严格的类型校验：

* **`verbatimModuleSyntax: true`**：类型导入必须加上 `type` 关键字。例如，必须写成 `import type { GameState } from '../types/game'`，严禁与普通变量混合导入。
* **`erasableSyntaxOnly: true`**：禁止使用在运行时无法被简单擦除的语法，即**严禁编写 `enum`（枚举）**、`namespace`（命名空间）以及类的参数属性（Parameter Properties）。
* **本地未使用变量拦截**：`noUnusedLocals` 和 `noUnusedParameters` 均已开启，代码中严禁留下任何未使用的本地变量与函数参数。

---

## 3. 采用的技术栈 (Tech Stack)

* **前端基础**：React 19 + Vite 8
* **样式系统**：Tailwind CSS 4（基于 `@tailwindcss/vite` 插件进行原生编译，未配置 PostCSS）
* **测试工具**：Vitest 4 + jsdom + @testing-library/react
* **代码规范**：Oxlint（配置文件位于 `.oxlintrc.json`，启用 `react/rules-of-hooks` 和 `react/only-export-components` 规则）

---

## 4. 测试编写规约 (Testing Patterns)

所有的单元测试与组件测试必须遵循以下沙盒模式：

* **环境标识**：所有的组件测试文件顶部，必须声明环境：`// @vitest-environment jsdom`。
* **Provider 包裹**：在测试用例中挂载组件时，必须使用 `<GameProvider>` 和 `<ToastProvider>` 容器进行完整包裹。
* **状态机脱水注入**：测试前必须往 `localStorage` 键 `aether_garden_save_Guest` 中注入 JSON 格式的模拟存档进行状态水合。默认的当前登录账户为 `Guest`，需在测试渲染前同时注入 `aether_garden_save_current_user`。
* **时空模拟**：凡是涉及植物成长、离线挂机时间计算的测试，必须在 `beforeEach` 中调用 `vi.useFakeTimers()`，并在 `afterEach` 中调用 `vi.useRealTimers()` 进行还原。

---

## 5. 项目目录架构 (Project Architecture)

* **`src/context/GameContext.tsx`**（约 1392 行）：游戏的核心状态机与业务逻辑中枢。包含所有的状态更新、离线收益心跳结算（Offline Tick）及多账号切换逻辑。
* **`src/data/`**：数据驱动的静态配置表目录。新增作物、制造配方、同伴数据或关卡时，**只改动此目录下的静态表，严禁改动 UI 组件代码**。
* **`src/components/`**：UI 表现组件目录。
  * 包含 **5 个主要 Tab 组件**（`ShelterTab.tsx`、`WorkshopTab.tsx`、`WildernessTab.tsx`、`DreamscapeTab.tsx`、`LogTab.tsx`）。
  * 包含 `SwipeCard.tsx`（遭遇卡滑动）、`ToastSystem.tsx`（消息提醒）及 `CloudSyncWidget.tsx`（云端同步小挂件）。
* **`src/types/`**：TypeScript 声明文件目录。
  * `config.ts`：纯静态配置接口。
  * `game.ts`：核心状态机数据结构。

---

## 6. 存档持久化与弹性同步

* **LocalStorage 持久化**：存档以 `aether_garden_save_${username}` 的格式在本地保存。生存者代号列表存放在 `aether_garden_accounts_list` 中。离线进度由启动时对比上一次存档的时间戳 `lastTick` 进行计算。
* **Supabase 优雅降级**：云端备份为可选配置。在未检测到 `.env` 环境变量中的 Supabase 密钥或网络断开时，Supabase 客户端需进行 try-catch 容错降级，无感隐藏同步挂件，确保单机本地 LocalStorage 依然能顺畅运行。

---

## 7. AI 开发辅助工具与插件

* **Reasonix 技能**：项目根目录 `.reasonix/` 下包含 22 个专为 Agent 设计的开发技能，遵循 `reasonix.toml` 权限声明。
* **Superpowers 插件**：
  * 通过 `opencode.json` 安装（源 `"superpowers@git+https://github.com/obra/superpowers.git"`）。
  * 若在 Windows 系统下遇到 Bun 依赖解析问题，可使用 `npm install superpowers@git+https://github.com/obra/superpowers.git --prefix "$HOME\.config\opencode"` 手动安装，并在 `opencode.json` 中配置指向路径为 `~/.config/opencode/node_modules/superpowers`。
