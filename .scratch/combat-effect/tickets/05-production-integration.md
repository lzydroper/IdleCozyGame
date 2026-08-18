# 05 — 生产接入：默认战斗行动走 Effect

**What to build:** 把生产战斗的默认行动从直接调用旧伤害公式切换为派发效果，让伤害/治疗统一经 `resolveEffect` 落地；战斗单位快照携带完整面板，事件日志能看到效果生效行。

**Blocked by:** 01 — Turn setup 钩子；02 — 统一 Modifier 核心与适配器；03 — BattleContext 骨架；04 — Effect 主 seam

**Status:** ready-for-agent

- [ ] 默认战斗行动改为派发伤害/治疗效果，不再直接调用旧 flat 伤害公式。
- [ ] 战斗单位快照携带完整面板（含特殊/派生属性），伤害效果直接读取。
- [ ] 伤害公式统一为 `DEF/(100+DEF)` + 元素 + 暴击 + 虚无豁免。
- [ ] 删除 `max(1, atk-def)` 旧公式及其重复结算路径。
- [ ] 战斗事件流与信息展示能显示 `effectApplied` 行。
- [ ] 按新行为改写或删除旧战斗测试；同一输入 + 同一 rng 种子仍确定。
