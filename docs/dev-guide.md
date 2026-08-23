# 开发指南（开发侧：代码组织与扩展菜谱）

> 配套文档：[config-guide.md](config-guide.md)（配置侧：json 字段参考与内容配方）。
> 命令速查见根目录 [AGENTS.md](../AGENTS.md)。本文回答「改某类功能该动哪些文件」。

---

## 1. 分层总览（数据流）

```
src/data/**/*.json          纯内容数据（仅 json，身份取内容字段，文件夹命名只是约定）
        ↓ 装配
src/configs/
  loaders/*                 glob/显式导入 + devGuard 校验 + icon→GameArt 解析 + 派生逻辑
  constants/*               数值/UI 常量、共享文案表
  types/*                   各域接口真相（data 不写类型，configs 是唯一类型家）
  mappings/iconMap.ts       iconKey → Lucide 组件注册表
  mappings/artMap.ts        icon 字符串 → GameArt（切图哈希 URL 或 Lucide）
  seed/initialState.ts      初始存档种子
        ↓ 消费
src/state/*                 运行时逻辑（战斗引擎 / 结算器 / 选择器 / 公式），不 import 数据层以外的东西
        ↓ 消费
src/context/GameContext.tsx 中央状态机（tick 循环、离线结算、账户、动作分发）
src/components/*            UI（7 个 Tab + 弹窗/组件）；组件只读 loader 出口与 GameContext
```

**铁律**
1. `data` 只放 json；`configs` 放接口/常量/装配；运行时逻辑归 `state`。
2. 消费方只准 import `configs/loaders|constants|types` 与 `state`，绝不直读 json、绝不手写配置副本。
3. 类型唯一真相在 `configs/types`；`src/types/game.ts|config.ts` 只放 GameState/跨域形状，可单向引用 configs/types。

## 2. 关键模块地图

### 战斗子系统（改战斗先读这节）

| 模块 | 职责 |
|---|---|
| `state/combat.ts` | 战斗编排入口：建实体、跑回合循环、结算奖励 |
| `state/turnEngine.ts` | 回合轴与事件总线。时机键两族：`TURN_TIMING_KEYS = roundStart/turnStart/turnActive/turnEnd/roundEnd`；`BATTLE_EVENT_KEYS = abilityUsed/attackAfter/damageTaken/healingTaken/death/summon/effectApplied` |
| `state/effectSystem.ts` | **主 seam**：所有效果统一为 EffectInstance，按 before(抵抗/免疫/参数修正) → during(执行) → present(展示) 落地；`EFFECT_EXECUTORS` 注册表按 EffectKind 分派 |
| `state/buffTypes.ts` + `buffRuntime.ts` | Buff 全数据驱动：json 直存策略（时长/叠层/触发/效果模板），触发结算时由物化器求值公式（`flat/perStack/livingEnemies/attack/maxHp`）并生成 EffectInstance |
| `state/abilityTypes.ts` + `abilityCompiler.ts` + `abilityRuntime.ts` + `abilityTargeting.ts` | Ability 静态配置 → ResolvedAbility 解析 → 编译为效果实例 → 目标选择 |
| `state/entityFactory.ts` | 实体工厂：HEROES_CONFIG/ENEMY_CONFIGS + 能力引用解析（引用缺失直接抛错）+ 完整性检查 |
| `state/modifier.ts` + `statSystem.ts` | 属性修饰符统一通道 `{stat, kind:'flat'|'percent', value}`；一切数值加成走 Modifier |
| `state/battleEventPresentation.ts` | 战斗事件 → 中文文案（含 idleFeed 播放） |

### 其余 state 模块（一句话版）

`equipment` 强化/套装/神话 · `awakening` 升星觉醒 · `summon` 抽卡 · `talents/talentsTree` 天赋树构建 · `heroGrowth` 成长公式 · `bonds` 羁绊判定 · `levelCombat/explorationProgress/stamina` 关卡探索 · `dropEngine` 掉落 · `workshop/facility/shelter/greenhouse/duty` 后勤产线 · `tick/offline/persistence` 心跳/离线/存档 · `nightmare/env/logs/idleFeed` 梦魇与环境事件/日志/挂机播放

## 3. 扩展菜谱

### 菜谱 A：新增一个 EffectKind（如「吸血攻击」「护盾」）

全部改动集中在 `state/effectSystem.ts` 的四处 + 视需要两处外围：

1. **`EffectKind` 联合**追加字面量（如 `'shield'`）。
2. **`EffectParamsMap`** 补该 kind 的参数形状（json 侧 params 即此形状）：
   ```ts
   shield: { amount: number };
   ```
3. **`EFFECT_AUDIT`** 加一行审核元数据：`affinity`（harmful/beneficial/neutral 决定驱散分类）+ `resist: 'none'|'will'`（will = 二元意志对抗）。
4. **`EFFECT_EXECUTORS`** 用 `defineExecutor<'shield'>({...})` 注册条目：
   - `immunityFlag?`：命中哪种免疫 flag 时被拦截（如 `immunityBuff:shield`）；
   - `before?`：参数修正钩子——数值过 `applyEffectModifiers(v, env.mods, 'effect.xxx')`，时长类再乘 `(1-env.durationReduction)`；
   - `during`（必填）：真正执行，读写 `ctx.turn`（dealDamage/applyHeal/addModifier/setFlag…），返回 `EffectResult{applied, values, ...}`；
   - `present?`：战斗日志文案。
5. **外围·json 可写性**：若该效果要能写在 abilities/buffs json 里，确认 `abilityCompiler.ts`（能力侧模板编译）或 `buffRuntime.ts` 物化器的 params 处理覆盖新参数；纯公式数值优先用 FormulaTemplate 词表扩展而不是硬编码。
6. **外围·测试**：`state/combat.test.ts` 族加行为用例；若动了词表，补 `combatConfigIntegrity.test`。

> 设计约束：resolveEffect 已内置递归链防环（chainKey）、effectApplied 事件派发；不要绕开 resolveEffect 手动执行效果。

### 菜谱 B：新增一个 Buff（数据驱动，零引擎改动）

只写一个 json：`src/data/combat/buffs/<buffId>.json`（字段参考见 config-guide 菜谱）。引擎自动经 combat.loader 进入 `BUFF_CONFIGS`。只有当现有公式原子（flat/perStack/livingEnemies/attack/maxHp）不够表达时才回菜谱 A/F。

### 菜谱 C：新增战斗时机

`turnEngine.ts`：往 `TURN_TIMING_KEYS` 或 `BATTLE_EVENT_KEYS` 追加 → 在回合循环相应位置 `dispatchEvent` → Buff triggers（json `"timing"`）即可引用。注意 `TurnEventKey` 含 `(string & {})` 宽尾，写错拼写不会报类型错——新增时机必须进 const 元组让编译器管住。

### 菜谱 D：新增属性

`statSystem.ts` 定义属性与默认值 → `configs/constants/statConfig.ts` 若属成长/战斗常量则同步 → json 侧在 baseAttributes/primaryAttributes/specialAttributes 三段中选对段落书写 → 文案如需展示补 `configs/constants/heroDisplay.ts` 的 PRIMARY_STAT_DESCRIPTIONS。

### 菜谱 E：新增 UI Tab / 弹窗

组件放 `components/`，Tab 在 `App.tsx` 注册；测试遵循 AGENTS.md「Testing patterns」（jsdom 注解 + localStorage 种子 + GameProvider/ToastProvider 包裹）。图标一律 `<GameIcon type=… id=… />`，不要自己拼图片 URL。

### 菜谱 F：新增公式原子（物化器词表）

`state/buffRuntime.ts` 物化器的公式求值处扩展一种 `{kind: 'xxx', …}` 形状 → 同步 buffTypes.ts 注释词表 → integrity 测试补样例。原则：**数值唯一真相在 effects 参数**（04 号票 B1），description 用 `{attackPct}` 类 token 由 loader 插值，禁止双写。

## 4. 验证纪律

- 每步改动：`npx tsc -b` → 相关测试；整项收工：`npm run build && npx vitest run && npm run lint` 三绿。
- devGuard（`configs/loaders/devGuard.ts`）会在 DEV 下校验表必填字段——新增域装配记得包 `devGuardTable(domain, raw, {required:[...]})`。
- 内容完整性有专门守卫测试：`items.registry.test`（icon 完整性/派生一致性）、`combatConfigIntegrity.test`、`farming.integrity.test` 等，扩域时照抄样板。
