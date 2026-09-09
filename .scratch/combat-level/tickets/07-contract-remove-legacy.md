# 07 — Contract：删除旧 zone/远征代码与全量验证

**What to build:** 所有新路径就绪后，删除旧战斗区域配置与类型、旧 zoneId/zonesCleared 字段与旧结算函数、旧远征配置表及所有旧语义测试；确认新配置满足 JSON 兼容约束，并让全量构建、lint 与测试恢复全绿。

**Blocked by:** 03, 04, 05, 06

**Status:** complete

- [x] 旧战斗区域配置、旧 zone 字段、旧 zone 结算/解锁/挂机路径全部删除，无死代码残留。
- [x] 旧远征配置表及其类型、引用全部删除。
- [x] 旧测试中依赖旧 zone/远征语义的用例删除或改写为新模型。
- [x] npm run build、npm run lint、npx vitest run 全部通过。
- [x] 区域/关卡配置保持纯数据 + satisfies + 仅类型导入，可被未来 JSON 直接承载。
