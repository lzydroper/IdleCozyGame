# Melvor-Rework 细节收尾、调整与改造 Spec

Status: ready-for-agent

## Problem Statement

AetherGarden 在进行 Melvor Idle 式改造过程中，仍存在幸存者系统与英雄系统割裂、战斗计算缺乏逐动作播报与倍速、缺少独立召唤界面与精准保底、属性加算乘算混淆、UI缺少英雄/装备/上阵小窗详情交互、Emoji硬编码等细节收尾与数值架构问题。玩家需要一个完全以 Hero 为中心、数据驱动、交互细腻且数值逻辑严密的废土魔导放置养成系统。

## Solution

1. **全面转向 Hero 体系**：彻底移除 Survivor，角色统一为 Hero。支持英雄后勤驻守（Facility Duty）并提供后勤 Meta 属性加成；在队伍上阵 Modal 中，处于后勤中或已上阵的英雄置灰、排最末端且不可点击。
2. **动态逐动作回合战斗**：支持按可配置动作间隔步进播放动画与扣血，提供 `1x / 2x / 4x` 循环倍速控制；非挂机战斗支持单场 Skip，战斗胜利全员复活满血。
3. **三层数值驱动引擎**：英雄与怪物共享纯函数属性引擎 `statSystem.ts`。划分元属性（STR/CON/AGI/INT/WIL/TRA）、基础属性（ATK/DEF/HP/MP/CritRate/CritDmg）与特殊属性（奥术增幅、机械负荷、虚无灵体等）。取消综合战力，伤害公式采用百分比减伤 $\text{Damage} = \text{ATK} \times \frac{100}{100 + \text{DEF}}$。
4. **升星 5 星上限与觉醒**：升星满星 5 星，满星溢出碎片 1:1 自动转换为通用共鸣碎片，重复抽中已满星英雄给予奥术星体。满星解锁【觉醒】按钮，消耗奥术星体觉醒，解锁专属技能与天赋节点。
5. **3 槽装备与 100% 强化**：保持武器、防具、饰品 3 槽位，强化概率 100% 成功。点击装备槽位弹出装备详情（套装羁绊、阵营加成标签、强化与替换/卸下）。
6. **独立英雄召唤与 100 抽保底**：专有大 View 界面，明确使用【招募券】与【灵魂残响】，累抽 100 抽必出未拥有英雄并醒目显示进度条 `25/100`。
7. **背包分类与零 Emoji 规范**：背包支持【全部】、【消耗品】、【装备】、【材料】、【碎片】分类切页。全面采用 Lucide React SVG 图标，杜绝 Emoji 硬编码。SQL 本地存档 `docs/schema.sql`。

## User Stories

1. As a player, I want all characters to be Heroes, so that I have a unified progression, levelling, and equipment system.
2. As a player, I want to assign Heroes to facility duty in my workshops, so that I can gain facility speed, yield, and resource reduction meta-buffs.
3. As a player, I want to open a party selection modal when clicking a party slot, so that I can conveniently select available heroes.
4. As a player, I want heroes assigned to facility duty or other combat slots to be grayed out, sorted to the bottom, and unclickable in the party modal, so that I don't accidentally cause assignment conflicts.
5. As a player, I want combat actions to play out turn-by-turn with clear action delays, so that I can visually observe my party fighting monsters.
6. As a player, I want a battle speed toggle cycling between 1x, 2x, and 4x speeds, so that I can control the pace of combat playback.
7. As a player, I want a "Skip" button in single-stage exploration encounters, so that I can instantly resolve non-idle battles when in a hurry.
8. As a player, I want my hero party to automatically restore to 100% HP upon winning a battle, so that every new battle starts at full combat readiness.
9. As a player, I want hero and monster attributes to be clearly split into Primary Attributes (STR, CON, AGI, INT, WIL, TRA), Base Attributes, and Special Attributes, so that stat scaling is consistent and transparent.
10. As a player, I want damage reduction to use a clear percentage formula rather than arbitrary flat subtractions, so that defense stats scale gracefully.
11. As a player, I want a maximum star tier of 5 stars, so that hero star-up progression has a clear cap.
12. As a player, I want excess soul shards beyond 5 stars to automatically convert 1:1 into universal Resonance Shards, so that duplicate shards are never wasted.
13. As a player, I want duplicates of already 5-star heroes from gacha to award Arcane Orbs directly, so that I can collect materials for Awakening.
14. As a player, I want to Awaken a 5-star hero using Arcane Orbs, so that I unlock unique awakening skills, exclusive talent nodes, and massive stat boosts.
15. As a player, I want the Awakening button to change to a disabled "Awakened" state once completed, so that I clearly know the hero has reached peak evolution.
16. As a player, I want 3 equipment slots (Weapon, Armor, Trinket) for each hero, so that gearing up is focused and meaningful.
17. As a player, I want equipment enhancement to have a 100% success rate, so that upgrading gear is reliable and rewarding without frustrating failures.
18. As a player, I want clicking an equipped slot in the Hero Detail screen to open an Equipment Detail Modal, so that I can view set bonuses, faction affinity tags, stats, and perform enhance, unequip, or replace actions.
19. As a player, I want a dedicated Hero Summoning full page with a Tavern aesthetic, so that recruitment feels immersive and clean.
20. As a player, I want recruitment to use accurate items (Summon Tickets or Soul Echoes), so that currency usage is clear.
21. As a player, I want a 100-pull pity counter with a visible progress bar (`25/100`), so that I am guaranteed to get an unowned hero after 100 recruits.
22. As a player, I want my inventory to support category tabs (All, Consumables, Equipment, Materials, Shards), so that managing large quantities of items is effortless.
23. As a player, I want crisp SVG icons instead of raw emojis across all UIs, so that the game looks clean, modern, and professional.

## Implementation Decisions

- **Architecture Seam**: All attribute calculations are centralized into a single pure functional engine `src/state/statSystem.ts` (`calculateEntityStats`). Both heroes and monsters pass through this same seam.
- **State Seam**: Hero state schema strictly uses `HeroState` in `GameState.heroes` with `logisticsFacilityId: string | null`. Survivor state is completely removed.
- **UI Seams**:
  - `HeroTab.tsx` delegates to `PartySlotModal.tsx` for party recruitment filtering.
  - `HeroDetailModal.tsx` handles level-ups, equipment slot views, and star-up/awakening transitions.
  - `EquipmentDetailModal.tsx` handles gear stats, enhancement (+30 max, 100% rate), faction tags, and set bonuses.
  - `SummonTab.tsx` provides full-page recruitment, pity tracking (`25/100`), and currency consumption.
  - `WorkshopTab.tsx` incorporates item category tab filtering.
- **ADR References**: All decisions recorded in `docs/adr/0007` through `docs/adr/0012`.
- **Database Archiving**: PostgreSQL schema archived at `docs/schema.sql`.

## Testing Decisions

- **Behavioral Testing Seams**:
  - `src/state/statSystem.test.ts`: Verify primary stat mapping to base stats, defense percentage reduction calculation, and stat modifier stacking.
  - `src/context/GameContext.test.tsx`: Hydrate state via `localStorage` key `aether_garden_save_Guest`, test party slot selection graying out, 100-pity recruitment guarantee, shard auto-conversion, and full-HP battle victory resets.
  - Components wrapped in `<GameProvider>` + `<ToastProvider>` with fake timers (`vi.useFakeTimers()`).
- **Prior Art**: Refer to existing `src/components/HeroTab.test.tsx` and `src/components/WorkshopTab.test.tsx`.

## Out of Scope

- Guild / Multiplayer PvP combat.
- Equipment destruction or RNG failure mechanics.
- Backward compatibility migration for old Survivor save data.

## Further Notes

- All configuration data (hero stats, equipment definitions, set effects, summon rates, item categories) must reside in `src/data/` as data-driven TypeScript constants.
