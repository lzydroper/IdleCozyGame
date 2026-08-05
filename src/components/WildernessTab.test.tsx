import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import WildernessTab from './WildernessTab';
import { COMBAT_ZONE_LIST } from '../data/combatZones';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

describe('WildernessTab Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks(); // 防止个别用例的 Math.random mock 泄漏到后续用例
  });

  it('should render the start exploration view initially', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/踏入废土荒野/i)).toBeDefined();
    expect(screen.getByText(/地表辐射/i)).toBeDefined();
  });

  it('should transition into exploration mode when clicking start', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    const startButton = screen.getByText(/开始探索/i);
    fireEvent.click(startButton);

    expect(screen.getByText(/临时背囊/i)).toBeDefined();
  });

  it('should trigger special rescue event for Catherine at step 5', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        catherine: { id: 'catherine', name: '凯瑟琳', role: 'farmer', isAssigned: false, realityLocationId: 'bio_lab' }
      },
      exploration: {
        inRealityExploration: true,
        realitySteps: 4,
        realityLocationId: 'bio_lab',
        realityBag: {}
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/生化实验室：营救凯瑟琳/i)).toBeDefined();
  });

  it('should trigger special rescue event for Buster at step 5', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        buster: { id: 'buster', name: '巴斯特', role: 'scout', isAssigned: false, realityLocationId: 'collapsed_subway' }
      },
      exploration: {
        inRealityExploration: true,
        realitySteps: 4,
        realityLocationId: 'collapsed_subway',
        realityBag: {}
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/坍塌地铁站：营救巴斯特/i)).toBeDefined();
  });

  it('should trigger special rescue event for Nova at step 5', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        nova: { id: 'nova', name: '诺娃', role: 'engineer', isAssigned: false, realityLocationId: 'military_depot' }
      },
      exploration: {
        inRealityExploration: true,
        realitySteps: 4,
        realityLocationId: 'military_depot',
        realityBag: {}
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/军火库：营救诺娃/i)).toBeDefined();
  });

  it('探索事件不再产生 HP 惩罚，战利品永不丢失（ticket 14）', async () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: { defensive_turret: 1 },
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        roy: { id: 'roy', name: '罗伊', role: 'engineer', isAssigned: false, realityLocationId: 'radar_station' },
        catherine: { id: 'catherine', name: '凯瑟琳', role: 'farmer', isAssigned: false }
      },
      exploration: {
        inRealityExploration: true,
        realitySteps: 4,
        realityLocationId: 'radar_station',
        realityBag: {}
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/雷达站：营救罗伊/i)).toBeDefined();

    const card = screen.getByText(/雷达站：营救罗伊/i);
    fireEvent.mouseDown(card, { clientX: 0 });
    fireEvent.mouseMove(card, { clientX: -200 });
    fireEvent.mouseUp(card);

    await act(async () => {
      await new Promise(r => setTimeout(r, 350));
    });

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    // 全局 HP 已废除：存档中不存在 hp，事件只消耗物品/资源
    expect('hp' in savedState.player).toBe(false);
    expect(savedState.inventory.defensive_turret).toBe(0); // 选项 A 消耗 1 台炮塔
    expect(savedState.player.food).toBe(100);
    expect(savedState.player.energy).toBe(100);
  });

  it('should gather raw scrap metal without Buster bonus (retired)', async () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // 强制选择第一个事件 ruined_truck

    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        buster: { id: 'buster', name: '巴斯特', role: 'scout', isAssigned: false }
      },
      exploration: {
        inRealityExploration: true,
        realitySteps: 0,
        realityLocationId: null,
        realityBag: {}
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/废弃的魔导卡车/i)).toBeDefined();

    const card = screen.getByText(/废弃的魔导卡车/i);
    fireEvent.mouseDown(card, { clientX: 0 });
    fireEvent.mouseMove(card, { clientX: -200 });
    fireEvent.mouseUp(card);

    await act(async () => {
      await new Promise(r => setTimeout(r, 350));
    });

    expect(screen.getByText(/废旧金属x3/i)).toBeDefined();

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realityBag.scrap_metal).toBe(3); // 被动退役后无 +30% 加成，废金属原样 3

    spy.mockRestore();
  });

  it('switches to combat mode and starts an auto battle in the first zone', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // 切换到战斗挂机模式
    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    expect(screen.getAllByText(/废土边缘/).length).toBeGreaterThan(0); // 区域卡标题 + 下一区解锁提示
    expect(screen.getByText(/战斗体力/)).toBeDefined();

    fireEvent.click(screen.getByText(/开战（体力 -10）/));

    const skipBtn1 = screen.queryByText('跳过');
    if (skipBtn1) fireEvent.click(skipBtn1);

    // 胜利结算展示 + 体力扣减 + 结算写入存档
    expect(screen.getAllByText(/战斗胜利/).length).toBeGreaterThan(0);
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.stamina).toBe(90);
    expect(savedState.combat.zoneId).toBe('wasteland_entrance');
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);
  });

  it('blocks battle when stamina is insufficient', () => {
    const save = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    save.stamina = 0;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    const button = screen.getByText(/开战（体力 -10）/);
    expect(button.hasAttribute('disabled')).toBe(true);

    fireEvent.click(button);
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat?.lastSettlement).toBeNull(); // 体力不足未开战
    expect(savedState.stamina).toBe(0);
  });

  it('resolves a combat encounter victory: exploration continues with loot and exp', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05); // 掉落命中 + 下一抽为 common 首卡
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false },
        soldier: { level: 1, exp: 0, hp: 160, maxHp: 160, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false }
      },
      party: ['nova', 'soldier'],
      exploration: {
        inRealityExploration: true,
        realitySteps: 1,
        realityBag: { scrap_metal: 2 },
        realityEventId: null,
        realityEncounterId: 'encounter_wasteland_pack'
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // 遭遇场景（与自动战斗同一战斗场景）
    expect(screen.getByText(/⚔️ 战斗遭遇 —— 废土掠食者群/)).toBeDefined();
    fireEvent.click(screen.getByText(/⚔️ 迎战！/));

    // 触发战斗动画播报 → 跳过（加快测试速度）
    const skipBtn = screen.queryByText(/跳过/);
    if (skipBtn) fireEvent.click(skipBtn);

    // 播完停留：不自动跳转，显示胜利结算与「继续探索」按钮（ticket 21 用户反馈 4）
    expect(screen.getByText(/战斗胜利！/)).toBeDefined();
    expect(screen.getByText('继续探索')).toBeDefined();

    // 用户主动点击后才离开遭遇战，继续探索
    fireEvent.click(screen.getByText('继续探索'));
    expect(screen.getByText(/废弃的魔导卡车/)).toBeDefined();
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realitySteps).toBe(2);
    expect(savedState.exploration.realityEncounterId).toBeNull();
    expect(savedState.exploration.inRealityExploration).toBe(true);
    // 掉落入探索背囊（与已获战利品合并：scrap 2 + 1）
    expect(savedState.exploration.realityBag.scrap_metal).toBe(3);
    expect(savedState.exploration.realityBag.glow_fiber).toBe(1);
    // 经验入账；探索遭遇消耗独立体力（100 - 5）
    expect(savedState.heroes.nova.exp).toBe(15);
    expect(savedState.stamina).toBe(95);
    // 同一战斗场景：结算记录
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);

    randomSpy.mockRestore();
  });

  it('resolves a combat encounter defeat: exploration ends, loot merged into inventory, party wounded', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false }
      },
      party: ['nova'],
      exploration: {
        inRealityExploration: true,
        realitySteps: 2,
        realityBag: { scrap_metal: 5, glow_fiber: 1 },
        realityEventId: null,
        realityEncounterId: 'encounter_workshop_horror'
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/⚔️ 战斗遭遇 —— 车间畸变体群/)).toBeDefined();
    fireEvent.click(screen.getByText(/⚔️ 迎战！/));

    // 触发战斗动画播报 → 跳过（加快测试速度）
    const skipBtn = screen.queryByText(/跳过/);
    if (skipBtn) fireEvent.click(skipBtn);

    // 播完停留：显示失败结算与「返回荒野」按钮，不自动跳转（ticket 21 用户反馈 4）
    expect(screen.getByText(/战斗失败！/)).toBeDefined();
    expect(screen.getByText('返回荒野')).toBeDefined();

    // 用户主动点击后才离开遭遇战，回到荒野入口
    fireEvent.click(screen.getByText('返回荒野'));
    expect(screen.getByText(/踏入废土荒野/)).toBeDefined();
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.inRealityExploration).toBe(false);
    expect(savedState.exploration.realitySteps).toBe(0);
    expect(savedState.exploration.realityEncounterId).toBeNull();
    expect(savedState.exploration.realityBag).toEqual({});
    expect(savedState.inventory.scrap_metal).toBe(5);
    expect(savedState.inventory.glow_fiber).toBe(1);
    expect(savedState.heroes.nova.wounded).toBe(true);
    expect(savedState.combat.lastSettlement.battle.victory).toBe(false);
  });

  it('blocks encounter battle without stamina but allows fleeing (不卡死探索)', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05); // 撤离后下一抽强制为 common 卡，避免再抽到遭遇
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false }
      },
      party: ['nova'],
      stamina: 0,
      exploration: {
        inRealityExploration: true,
        realitySteps: 1,
        realityBag: { scrap_metal: 1 },
        realityEventId: null,
        realityEncounterId: 'encounter_wasteland_pack'
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    const fightButton = screen.getByText(/⚔️ 迎战！/);
    expect(fightButton.hasAttribute('disabled')).toBe(true); // 体力不足
    expect(screen.getByText(/体力不足/)).toBeDefined();

    // 撤离：不战而退，探索继续
    fireEvent.click(screen.getByText(/🚩 撤离/));
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realityEncounterId).toBeNull();
    expect(savedState.exploration.realitySteps).toBe(2);
    expect(savedState.exploration.inRealityExploration).toBe(true);
    expect(savedState.exploration.realityBag.scrap_metal).toBe(1);
    expect(savedState.heroes.nova.wounded).toBe(false);

    randomSpy.mockRestore();
  });

  it('boss victory clears the zone and unlocks the next zone (线性区域链)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    // 初始仅首区解锁：区2、区3 显示未解锁
    expect(screen.getAllByText(/🔒 未解锁/).length).toBe(2);
    expect(screen.getByText(/👑 关底 BOSS：🦁 废土鬣狗王/)).toBeDefined();

    // 单诺娃挑战区1 BOSS → 胜利通关
    fireEvent.click(screen.getByText(/⚔️ 挑战 BOSS（体力 -12）/));

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);
    expect(savedState.combat.zonesCleared).toEqual(['wasteland_entrance']);
    expect(savedState.stamina).toBe(100 - 12); // BOSS 战消耗体力
    // 区2 解锁：未解锁徽章从 2 减到 1，且出现"已通关"徽章
    expect(screen.getAllByText(/🔒 未解锁/).length).toBe(1);
    expect(screen.getByText(/✓ 已通关/)).toBeDefined();
  });

  it('arms offline idle from the combat panel and stops it preserving stamina (确认式离线挂机)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));

    // 区域卡上的挂机开关（首区可挂机，其余未解锁禁用）
    const idleButtons = screen.getAllByText(/⏳ 开始挂机/);
    expect(idleButtons.length).toBe(COMBAT_ZONE_LIST.length);
    expect(idleButtons[0].hasAttribute('disabled')).toBe(false);
    fireEvent.click(idleButtons[0]);

    // 挂机状态横幅出现：不立即战斗、不消耗体力
    expect(screen.getByText(/挂机中：/)).toBeDefined();
    expect(screen.getAllByText(/⏹ 停止挂机/).length).toBeGreaterThan(0);
    let saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.zoneId).toBe('wasteland_entrance');
    expect(saved.combat.lastSettlement).toBeNull();
    expect(saved.stamina).toBe(100);

    // 停止挂机：剩余体力保留
    fireEvent.click(screen.getAllByText(/⏹ 停止挂机/)[0]);
    saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.zoneId).toBeNull();
    expect(saved.stamina).toBe(100);
  });

  it('blocks idle arming when stamina is insufficient', () => {
    const save = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    save.stamina = 0;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    const idleButtons = screen.getAllByText(/⏳ 开始挂机/);
    expect(idleButtons[0].hasAttribute('disabled')).toBe(true);
    fireEvent.click(idleButtons[0]);

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat?.idle?.zoneId).toBeNull(); // 体力不足未开启挂机
  });

  it('shows the active bond in the combat panel (羁绊加成在战斗区可见)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.roy = createInitialHero('roy');
    save.party = ['nova', 'roy'];
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    // 机械搭档（诺娃 + 罗伊）：攻击 +10%
    expect(screen.getByText(/机械搭档/)).toBeDefined();
    expect(screen.getByText(/攻击 \+10%/)).toBeDefined();
  });

  it('renders a draw settlement as 平局 rather than defeat (三态结算展示)', () => {
    // 水合一个平局结算（victory=false 且 partyWiped=false），当前数据下无法自然产生
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: { nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false } },
      party: ['nova'],
      stamina: 100,
      combat: {
        zoneId: 'wasteland_entrance',
        lastSettlement: {
          battle: { victory: false, partyWiped: false, rounds: 60, actions: [] },
          drops: {},
          soulEchoes: 0,
          expPerHero: 0,
          woundedHeroIds: []
        },
        zonesCleared: []
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    const skipBtn2 = screen.queryByText('跳过');
    if (skipBtn2) fireEvent.click(skipBtn2);

    expect(screen.getByText(/战斗平局/)).toBeDefined();
    expect(screen.queryByText(/💥 战斗失败/)).toBeNull();
    expect(screen.getByText(/鏖战至回合上限未分胜负/)).toBeDefined();
  });

  it('renders awakened skill actions in the battle log (strike shows target, heal shows +N)', () => {
    // 水合一场含觉醒技能结算：strike 有目标名、heal 为自身治疗
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: { nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: true } },
      party: ['nova'],
      stamina: 100,
      combat: {
        zoneId: 'wasteland_entrance',
        lastSettlement: {
          battle: {
            victory: true, partyWiped: false, rounds: 2,
            actions: [
              { round: 1, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '☄️', targetName: '废土鬣狗', damage: 28, kind: 'skill', skillName: '电涌过载' },
              { round: 1, actorSide: 'enemy', actorId: 'e1', actorName: '废土鬣狗', actorEmoji: '🐺', targetName: '诺娃', damage: 6, kind: 'attack' },
              { round: 2, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '☄️', targetName: '诺娃', damage: 76, kind: 'heal', skillName: '净化之泉' }
            ]
          },
          drops: {},
          soulEchoes: 0,
          expPerHero: 20,
          woundedHeroIds: []
        },
        zonesCleared: []
      }
    }));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));
    const skipBtn3 = screen.queryByText('跳过');
    if (skipBtn3) fireEvent.click(skipBtn3);

    // strike：发动【技能】→ 目标名（技能 span 内含目标）；heal：发动【技能】+治疗量（无目标箭头）
    expect(screen.getByText(/发动【电涌过载】/).textContent).toContain('废土鬣狗');
    expect(screen.getByText('-28')).toBeDefined(); // strike 伤害
    expect(screen.getByText(/发动【净化之泉】/).textContent).not.toContain('→'); // heal 无目标箭头
    expect(screen.getByText('+76')).toBeDefined(); // heal 治疗量
  });

  it('replays the animation for consecutive identical battles (unique key per battle)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/⚔️ 战斗挂机/));

    // 第一场：点击开战 → 动画播放中（跳过按钮可见）
    fireEvent.click(screen.getAllByText(/开战（体力 -10）/)[0]);
    expect(screen.getByText('跳过')).toBeDefined();
    fireEvent.click(screen.getByText('跳过'));
    // 播完：结算卡片可见、无跳过按钮（进入完成态）
    expect(screen.queryByText('跳过')).toBeNull();
    expect(screen.getAllByText(/战斗胜利！/).length).toBeGreaterThan(0);

    // 第二场（内容与第一场完全相同）：点击开战 → 重新播放动画
    fireEvent.click(screen.getAllByText(/开战（体力 -10）/)[0]);
    expect(screen.getByText('跳过')).toBeDefined();
    fireEvent.click(screen.getByText('跳过'));
    expect(screen.queryByText('跳过')).toBeNull();
  });
});
