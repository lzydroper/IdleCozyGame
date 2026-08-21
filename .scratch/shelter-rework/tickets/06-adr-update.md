# 06 - ADR 更新：覆盖 ADR-0007 半成品状态

**What to build:** 新建 ADR 记录 `logisticsFacilityId` 改为结构化对象 `DutyAssignment` 的决策，覆盖 ADR-0007 的半成品状态，说明 `shelter.assigned*` 降级为缓存索引、设施驻守机制完整实现。

**Blocked by:** 01 - 后勤指派模型统一

**Status:** ready-for-agent

- [ ] 新建 `docs/adr/0018-duty-assignment-unification.md`
- [ ] 记录决策：`logisticsFacilityId` 改为 `DutyAssignment { type, targetId } | null`
- [ ] 记录 `shelter.assignedWatererId` / `assignedExplorerId` 降级为缓存索引（真相源是 hero 字段）
- [ ] 记录 ADR-0007"每台设施驻守 1 名英雄"决策的完整实现（dutyMeta 接入产线 tick）
- [ ] 记录废除 `assignHeroJob` / `startExpedition` / `stopExpedition` 三入口、统一为 `assignHeroToDuty` 的决策
- [ ] 记录 alpha 不迁移旧存档的决策（沿用 ADR-0013）
- [ ] 更新 ADR-0007 的 Status 为 superseded，指向 ADR-0018
