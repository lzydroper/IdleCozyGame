# 01 — 道具边界修订与胶囊效果定义

**What to build:** 场景/事件消耗装置（防御炮塔、重载护盾电池、盖革探测仪、偏光魔导镜片）从道具类改归资源类，背包「资源」分类展示、不再出现在「道具」分类；稳定胶囊与跃迁胶囊的物品定义补充「转化为梦境充能 +1 次」的效果；物品元数据类型的即时效果字段扩展支持充能效果；物品注册表一致性测试的分类断言与数量分布同步更新。

**Blocked by:** None — can start immediately

**Status:** resolved

- [x] 4 个装置在背包「资源」tab 下可见，道具 tab 不再包含它们；其场景消耗功能（救援事件/梦魇防御）不受影响
- [x] 稳定胶囊/跃迁胶囊定义含充能效果（1 个 = +1 次梦境充能）
- [x] 类型层即时效果支持充能类效果
- [x] 注册表测试分类断言更新（道具 11 / 资源 39），全量测试、构建、lint 绿

## Answer

已在分支 `hero-ehco` 完成（commit `5be634d`），全量 334 测试通过（+1）、tsc/vite build 绿、oxlint 与基线一致（4 错误 7 警告均为基线遗留，零新增）。

**实施要点**：
- `ItemMeta.useEffect` 扩展 `capsuleCharge`（`{ sanity_capsule?, warp_capsule? }`，1 个 = +1 次梦境充能）；稳定/跃迁胶囊定义补该效果；
- 4 个场景装置（防御炮塔/重载护盾电池/盖革探测仪/偏光魔导镜片）由 `props.ts` 迁入 `resources.ts`（category `item` → `resource`），sprite/icon 原样保留；所有消费方经 `ITEMS_CONFIG` 按 id 引用，自动跟随新分类；
- `applySupplyItemUpdate` 加保护：仅含未接线 `capsuleCharge` 效果的物品调用时拒绝消耗（防「物品被扣、充能未加」的静默吞没），完整接线归属 ticket 04；
- 测试：`registry.test.ts` 分类分布 11/39 更新 + 新增「场景装置归资源」「胶囊充能效果」两组断言；`LogTab.test.tsx` 新增 UI 验收（装置在资源 tab、不在道具 tab）；`expansion.test.tsx` 新增胶囊防吞单测（`useSupplyItem('sanity_capsule')` 不消耗、充能不变化）。

