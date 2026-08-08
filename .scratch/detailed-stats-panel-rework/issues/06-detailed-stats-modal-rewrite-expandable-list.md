# 06 - DetailedStatsModal 重写为可展开折叠列表

**What to build:** 重写 `DetailedStatsModal.tsx`，从当前三块分类卡片（基础属性/一级元属性/高级防务）改为：不分大类，21 项可修饰属性（Base 6 + Primary 6 + Special 9）依次平铺罗列，后接派生属性行。每行默认折叠只显示属性名 + 当前总值；点击整行展开显示该属性的 Modifier 来源分解（按 source 分组，每条显示来源名 + 贡献值）。派生属性行展开显示元属性贡献列表（02 号产出）。不写属性介绍文字。保持现有暗色 zinc 风格 + UI_TOKENS。`React.memo` 包裹保留。

**Blocked by:** 02 - 派生属性贡献计算, 03 - 四来源产出函数打 source 标签, 04 - 里程碑加成转 StatModifier, 05 - HeroDetailModal 补齐完整 modifier 接入

**Status:** resolved

- [ ] `DetailedStatsModal` props 扩展：接收 `modifiers: StatModifier[]`（来源分解数据）和派生属性贡献数据（02 号产出）
- [ ] 属性行顺序：攻击/防御/生命/魔力/暴击率/暴击倍率（Base 6）→ 力量/体质/敏捷/智慧/意志/超越（Primary 6）→ 奥术增幅/奥术抵抗/机械负荷/机械进化/梦魇侵蚀/虚无灵体/英灵鼓舞/星界引导/魂印驱动（Special 9）→ 派生属性（减伤率/免暴击率/冷却缩减/伤害豁免等）
- [ ] 每行：左侧属性名（来自 `STAT_META.label`），右侧当前总值；可展开行右侧有箭头/三角图标
- [ ] 点击整行切换展开/折叠状态；默认全部折叠
- [ ] 可修饰属性行展开后：调用 `aggregateModifiersBySource`（01 号）按来源分组显示，每条显示来源名 + 贡献值（flat/percent）
- [ ] 派生属性行展开后：显示元属性贡献列表（02 号 `getDerivedStatContributions`），每条显示元属性名 + 当前值 + 系数 + 贡献值
- [ ] 无 modifier 来源的属性行不可展开（或展开后显示"无外部加成"）
- [ ] 移除 `PRIMARY_STAT_DESCRIPTIONS` 的使用（不写属性介绍文字）
- [ ] 保持暗色 zinc 风格 + `UI_TOKENS` 类名体系
- [ ] `React.memo` 包裹保留，确保 props 稳定时跳过重渲染
- [ ] 视觉验收：界面接近参考图的布局结构（平铺列表 + 可展开），但配色保持暗色
