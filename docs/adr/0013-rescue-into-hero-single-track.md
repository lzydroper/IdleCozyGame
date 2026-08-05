# 救援链并入英雄单轨：废弃 state.survivors

Status: accepted

## 背景

ADR-0001（英雄获取模型：统一召唤池）与 ADR-0007（废除幸存者系统）已决策：所有角色统一为英雄实体，救援链保留为免费获取途径。但代码层长期残留双轨：梦境共鸣解锁与地表救援只写入独立的 `GameState.survivors` 动态状态，从不写入 `state.heroes`。后果是救援获得的英雄在英雄页不可见、无法上阵/养成/驻守，与"幸存者只是英雄的别称"的领域定位矛盾。

## 决策

- **删除 `GameState.survivors` 动态状态**，英雄是唯一角色实体。
- 共鸣进度与救援锁定并入 `exploration.rescueProgress: Record<heroId, { resonance: number; locationId?: string }>`：`locationId` 存在 ⇔ 共鸣满 100% 且坐标已锁定，可发起救援。
- 救援成功 → `heroes[heroId] = createInitialHero(heroId)` 并从 `rescueProgress` 移除该条目。`heroes` 中永远只含已获得英雄，召唤的 `alreadyOwned` 语义（`!!state.heroes[id]`）保持简单。
- `SURVIVORS_CONFIG` 保留为**剧情档案**（静态配置，非状态）：`role`/`roleLabel`（远征派遣职业判定）、`dreamTrigger`（共鸣剧情）、`realityLocationId`（救援地点）。`HEROES_CONFIG` 负责战斗/养成（职阶、阵营、后勤 Meta）。
- 内部标识符（`GameIcon` 的 `survivors` 雪碧图 sheet、`rescue_*` 事件 id）保留——它们是资源名/事件键，非领域概念。
- **alpha 阶段不做旧存档迁移**：旧存档中的 `survivors`/`survivorResonance` 数据直接丢弃（按新默认初始化），以新功能完整落地优先。

## Considered Options

- **保留双轨（survivors + heroes 并存）**：改动最小，但救援角色继续游离于英雄体系外，与 ADR-0001/0007 矛盾，且 UI 需维护两套名单。否决。
- **`heroes[id]` 上挂 `realityLocationId`（锁定即入 heroes）**：单轨但模糊"获得"语义——锁定坐标不等于拥有，召唤的 `alreadyOwned` 判定与英雄列表展示会引入特判。否决，选择独立的 `rescueProgress` 进度态。
- **做旧存档迁移**：将旧 `survivors` 合并进 `heroes`。增加持久化复杂度且迁移逻辑只在 alpha 期一次性使用。否决（alpha 决策）。

## Consequences

- 救援/共鸣解锁的英雄在英雄页立即可见，可上阵、养成、驻守，与召唤获得的英雄无差别。
- 旧存档（含 `survivors`/`survivorResonance` 字段）加载时这些数据被丢弃；`persistence.ts` 的合并逻辑相应简化。
- 功能 UI 文案统一为「英雄」；「幸存者」仅作为剧情 flavor 别称出现。
