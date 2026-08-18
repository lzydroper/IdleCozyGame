# 01 — Buff 契约与配置注册表落地

**What to build:** 落地 Buff 模块的类型契约与配置注册表：buffId 可查到 Duration 类型、Renew、Stack、Stack 增量、Trigger 数组与消耗开关；BuffInstance 增加「创建时传入的数值」字段；BuffApplication 增加 applied 字段以区分「新建 / 刷新 / 拒绝」。本票只打地基，保持现状行为（同 buffId 仍返回 refreshed），不实现触发、清理或眩晕修订。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] 配置注册表可按 buffId 查询策略，至少覆盖灼烧、眩晕、折焰、战意四类样本配置。
- [x] BuffInstance 具备传入数值字段，所有现有构造点编译通过。
- [x] BuffApplication 返回 applied 字段，现有调用与测试全部更新且通过。
- [x] 配置读取不改变配置对象本身；实例化不把策略写回实例。
- [x] 测试：注册表查询、类型契约（新增字段）、现有占位行为回归。
