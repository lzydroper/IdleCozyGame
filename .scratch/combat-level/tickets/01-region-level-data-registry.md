# 01 — Region/Level 数据注册表与内容迁移（Expand）

**What to build:** 以纯新增方式落地新数据模型：区域（Region）内嵌有序关卡（Level），关卡只带区域内稳定 local id；掉落三形态（fixed/chance/weighted）、远征配置块、探索里程碑类型与派生查询全部就位。把现有 4 个战斗区域内容迁入新注册表——3 个主线区域 + 1 个测试区域，每区 2 关，敌池/事件池/掉落表按已定决策与内容映射草稿填写。旧战斗配置继续可用，本轮不产生行为变化。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Region/Level/DropEntry/ExpeditionConfig/Milestone 类型落地；Region.levels 为有序数组，末位为区域关底；Level.id 区域内唯一且稳定。
- [ ] 新注册表包含 3 个主线区域（wasteland_entrance / old_town_ruins / radiated_workshop）与 1 个测试区域（isTestZone），每区 2 关；敌池、关卡敌人、事件池与掉落表符合决策集和内容映射草稿。
- [ ] 主线顺序由 Region.order 升序确定，测试区域排除；recommendedLevel 仅作展示字段。
- [ ] 提供纯查询函数：按区域取有序关卡、按 regionId+localId 取关卡、由关卡反查区域；重复 local id 或未知引用可被测试发现。
- [ ] 探索配置提供全局 minRunSteps=7，供后续探索进度读取。
- [ ] 新数据与查询函数的单元测试绿；旧代码、旧测试保持绿。
