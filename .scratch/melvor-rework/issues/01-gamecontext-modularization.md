# 01 — GameContext 状态机模块化（前置重构）

**What to build:** 把中央状态机按领域拆成独立模块（英雄、战斗、产线、探索、账号等），`GameContext` 只做模块装配、持久化与对外接口。纯重构：运行时行为零变化，为后续 6 大系统落地提供干净地基，避免单文件状态机膨胀到 3000+ 行。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 现有全部游戏逻辑迁移到领域模块，`GameContext` 仅装配模块与读写存档
- [ ] 模块间通过显式接口交互，不互相 import 内部状态
- [ ] 现有测试套件全部通过（无行为变化，纯结构迁移）
- [ ] 存档格式保持向后兼容（旧存档可读）
