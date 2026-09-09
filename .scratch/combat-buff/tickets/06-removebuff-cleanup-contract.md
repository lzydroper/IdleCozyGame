# 06 — removeBuff 清理契约：注销 + Modifier 回收 + 删除

**What to build:** removeBuff 一次完成三件事：注销该 Buff 在时机注册表的所有条目、按 Modifier.source 反查并移除其 owned Modifier、删除实例记录。驱散与到期移除走同一条路径；战意式重算不残留旧 Modifier。

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [x] removeBuff 注销目标 Buff 的全部时机订阅。
- [x] Buff 持有的 Modifier 以稳定 source 标记归属，removeBuff 按该标记反查并移除。
- [x] removeBuff 删除实例记录，get/list 不再返回该 Buff。
- [x] 驱散效果移除带 Modifier 的 Buff 后，Modifier 查询为空且事件流无残留触发。
- [x] 战意式重算：先移除旧 Modifier、再计算、再挂新 Modifier，最终只保留最新一份。
- [x] 测试：三件事齐全、重复移除幂等、带 Modifier Buff 的驱散、重算无残留。
