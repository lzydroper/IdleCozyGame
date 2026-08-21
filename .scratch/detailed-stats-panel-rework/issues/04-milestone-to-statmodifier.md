# 04 - 里程碑加成转 StatModifier

**What to build:** 将英雄等级里程碑加成（`getLevelMilestoneBonus`）从当前"手动拆分塞进三层属性"改为生成 `StatModifier[]`，每条带 `source: 'Lv{N}里程碑'`。新增函数 `getMilestoneModifiers(config, level): StatModifier[]`，将里程碑的 base/primary/special 三层加成统一转为 flat modifier。`combat.ts` 和 `HeroDetailModal.tsx` 两处的手动拆分逻辑改为调用此函数并纳入 `permanentModifiers` 数组，消除两处重复代码。

**Blocked by:** 01 - StatModifier 加 source 字段 + 按来源分组聚合

**Status:** resolved

- [ ] 新增 `getMilestoneModifiers(config, level): StatModifier[]`，将里程碑配置（`Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>`）转为 `StatModifier[]`，每条 `kind: 'flat'`，`source: 'Lv{N}里程碑'`
- [ ] `src/state/combat.ts:243-269` - 移除手动拆分里程碑到 primaryAttributes/specialAttributes 的逻辑，改为调用 `getMilestoneModifiers` 并 push 进 `permanentModifiers`
- [ ] `src/components/HeroDetailModal.tsx:91-127` - 同步移除手动拆分逻辑，改为接入完整 `permanentModifiers`（此步与 05 号有交集，此处只需移除里程碑手动拆分部分）
- [ ] `heroBaseAttributes` 不再包含里程碑 base 部分（只保留 Lv1 种子 + 职阶成长 × level），里程碑 base 加成走 modifier 管道
- [ ] 战斗计算结果不变（数值等价验证：转换前后的 `calculateEntityStats` 输出一致）
- [ ] 更新 `heroes.test.ts` 和 `combat.test.ts` 中受影响的测试用例
