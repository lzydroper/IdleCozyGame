# 01 - 后勤指派模型统一（wide refactor）

**What to build:** 将 `HeroState.logisticsFacilityId` 从 `string | null` 改为结构化对象 `DutyAssignment | null`，废除 `assignHeroJob` / `startExpedition` / `stopExpedition` 三入口，统一为 `assignHeroToDuty(heroId, duty | null)`。`shelter.assignedWatererId` / `assignedExplorerId` 降级为缓存索引。这是一个 wide refactor--类型变更影响 `PartySlotModal` / `HeroListModal` / `initialState` / 多个测试文件，需 expand-contract 序列保持 CI 绿。

**Blocked by:** None - can start immediately

**Status:** ready-for-agent

- [ ] 新增 `DutyAssignment` 类型（`{ type: 'waterer'|'explorer'|'facility', targetId: string }`）和 `assignHeroToDutyUpdate` 纯函数（`state/shelter.ts`），内部按 type 分支处理指派/解除/排他/缓存同步
- [ ] `HeroState.logisticsFacilityId` 类型改为 `DutyAssignment | null`（expand：旧 string 形式兼容期可共存，或一次性切换因 alpha 不迁移）
- [ ] `GameContext` 暴露 `assignHeroToDuty`，移除 `assignHeroJob` / `startExpedition` / `stopExpedition`
- [ ] `PartySlotModal` / `HeroListModal` 适配新类型（`Boolean(heroState?.logisticsFacilityId)` 逻辑不变，mock 数据改为结构化对象）
- [ ] `initialState.ts` 的 `logisticsFacilityId: null` 适配
- [ ] `ShelterTab` 中浇水指派 UI 调用 `assignHeroToDuty`（远征/设施驻守 UI 在各自 ticket 中接入）
- [ ] state 层测试：`assignHeroToDutyUpdate` 指派/解除/排他性/缓存同步
- [ ] `heroesDuty.test.ts` / `PartySlotModal.test.tsx` mock 数据适配
