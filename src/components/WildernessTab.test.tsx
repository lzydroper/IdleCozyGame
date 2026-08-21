import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import WildernessTab from './WildernessTab';
import { COMBAT_CONFIG } from '../data/combatConfig';
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

    fireEvent.click(screen.getByText(/探索【废土边缘】/));

    expect(screen.getByText(/临时背囊/i)).toBeDefined();
  });

  it('uses the region initial cost and draws from the region event pool', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05);
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // 测试区域（军备测试场）事件池为空，不应出现在探索目的地
    expect(screen.queryByText(/军备测试场/)).toBeNull();

    fireEvent.click(screen.getByText(/探索【旧城废墟】/));

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.player.food).toBe(90); // 区域 initialCost 10
    expect(saved.exploration.inRealityExploration).toBe(true);
    const eventId = saved.exploration.realityEventId;
    expect([
      'abandoned_train', 'abandoned_cart', 'waste_pool', 'thorn_thicket',
      'wasteland_bandits', 'bat_swarm', 'hydrological_station', 'wild_fruit',
      'ancient_library', 'sandstorm', 'magnetic_storm', 'encounter_ruin_raiders'
    ]).toContain(eventId);

    randomSpy.mockRestore();
  });

  it('should trigger special rescue event for Catherine at step 5', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      exploration: {
        rescueProgress: {
          catherine: { resonance: 100, locationId: 'bio_lab' }
        },
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
      exploration: {
        rescueProgress: {
          buster: { resonance: 100, locationId: 'collapsed_subway' }
        },
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
      exploration: {
        rescueProgress: {
          nova: { resonance: 100, locationId: 'military_depot' }
        },
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
      heroes: {
        catherine: createInitialHero('catherine')
      },
      exploration: {
        rescueProgress: {
          roy: { resonance: 100, locationId: 'radar_station' }
        },
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
      heroes: {
        buster: createInitialHero('buster')
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
    fireEvent.click(screen.getByText(/战斗挂机/));
    expect(screen.getAllByText(/废土边缘/).length).toBeGreaterThan(0); // 区域卡标题 + 下一区解锁提示
    expect(screen.getByText(/战斗体力/)).toBeDefined();

    fireEvent.click(screen.getAllByText(/开战（体力 -10）/)[0]);

    // 胜利结算展示 + 体力扣减 + 结算写入存档
    expect(screen.getAllByText(/战斗胜利/).length).toBeGreaterThan(0);
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.stamina).toBe(90);
    expect(savedState.combat.regionId).toBe('wasteland_entrance');
    expect(savedState.combat.levelId).toBe('wasteland_entrance_1');
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

    fireEvent.click(screen.getByText(/战斗挂机/));
    const button = screen.getAllByText(/开战（体力 -10）/)[0];
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
    expect(screen.getByText(/战斗遭遇 —— 废土掠食者群/)).toBeDefined();
    fireEvent.click(screen.getByText(/迎战！（体力/));

    // 事件流结算展示：胜利结算 +「继续探索」按钮
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
        nova: { level: 1, exp: 0, hp: 5, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false } // 残血进场必败
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

    expect(screen.getByText(/战斗遭遇 —— 车间畸变体群/)).toBeDefined();
    fireEvent.click(screen.getByText(/迎战！（体力/));

    // 事件流结算展示：失败结算 +「返回荒野」按钮
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

    const fightButton = screen.getByText(/迎战！（体力/);
    expect(fightButton.hasAttribute('disabled')).toBe(true); // 体力不足
    expect(screen.getByText(/体力不足/)).toBeDefined();

    // 撤离：不战而退，探索继续
    fireEvent.click(screen.getByText(/^撤离$/));
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realityEncounterId).toBeNull();
    expect(savedState.exploration.realitySteps).toBe(2);
    expect(savedState.exploration.inRealityExploration).toBe(true);
    expect(savedState.exploration.realityBag.scrap_metal).toBe(1);
    expect(savedState.heroes.nova.wounded).toBe(false);

    randomSpy.mockRestore();
  });

  it('boss victory clears the zone and unlocks the next zone (线性区域链)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/战斗挂机/));
    // 初始仅首区解锁：区2、区3 显示未解锁
    expect(screen.getAllByText(/未解锁/).length).toBe(2);
    expect(screen.getByText(/废土边缘 · 鬣狗王/)).toBeDefined();

    // 单诺娃挑战区1 关底（末位关卡）→ 胜利通关
    fireEvent.click(screen.getByText(/开战（体力 -12）/));

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);
    expect(savedState.combat.clearedLevels.wasteland_entrance).toContain('wasteland_entrance_2');
    expect(savedState.stamina).toBe(100 - 12); // 关底战消耗体力
    // 区2 解锁：未解锁徽章从 2 减到 1，且出现"已通关"徽章
    expect(screen.getAllByText(/未解锁/).length).toBe(1);
    expect(screen.getAllByText(/^已通关$/).length).toBeGreaterThan(0);
  });

  it('arms idle from the combat panel in a cleared zone and stops it preserving stamina (挂机需已通关)', () => {
    // 修复：挂机仅限已通关区域
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/战斗挂机/));

    // 默认展开首区，因此只渲染首区 2 个关卡的挂机按钮
    const idleButtons = screen.getAllByText(/开始挂机/);
    expect(idleButtons.length).toBe(2);
    expect(idleButtons[0].hasAttribute('disabled')).toBe(false); // 首区第 1 关已通关可挂机
    expect(idleButtons[1].hasAttribute('disabled')).toBe(true);   // 首区第 2 关未通关不可挂机
    fireEvent.click(idleButtons[0]);

    // 挂机状态横幅出现：不立即战斗、不消耗体力
    expect(screen.getByText(/挂机中：/)).toBeDefined();
    expect(screen.getAllByText(/停止挂机/).length).toBeGreaterThan(0);
    let saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.regionId).toBe('wasteland_entrance');
    expect(saved.combat.idle.levelId).toBe('wasteland_entrance_1');
    expect(saved.combat.lastSettlement).toBeNull();
    expect(saved.stamina).toBe(100);

    // 停止挂机：剩余体力保留
    fireEvent.click(screen.getAllByText(/停止挂机/)[0]);
    saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.regionId).toBeNull();
    expect(saved.combat.idle.levelId).toBeNull();
    expect(saved.stamina).toBe(100);
  });

  it('blocks idle arming when stamina is insufficient', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.stamina = 0;
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] }; // 已通关，纯体力不足场景
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/战斗挂机/));
    const idleButtons = screen.getAllByText(/开始挂机/);
    expect(idleButtons[0].hasAttribute('disabled')).toBe(true);
    fireEvent.click(idleButtons[0]);

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat?.idle?.regionId).toBeNull(); // 体力不足未开启挂机
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

    fireEvent.click(screen.getByText(/战斗挂机/));
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
          battle: { outcome: 'draw', victory: false, partyWiped: false, rounds: 60, events: [] },
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

    fireEvent.click(screen.getByText(/战斗挂机/));

    expect(screen.getByText(/战斗平局/)).toBeDefined();
    expect(screen.queryByText(/战斗失败/)).toBeNull();
    expect(screen.getByText(/达到轮次上限/)).toBeDefined();
  });

  it('renders battle events in the combat event log (skill/attack/heal)', () => {
    // 水合一场含技能/攻击/治疗的战斗事件流
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
            outcome: 'victory',
            victory: true,
            partyWiped: false,
            rounds: 2,
            events: [
              { seq: 0, round: 1, key: 'attackAfter', unitId: 'nova', sourceId: 'nova', targetId: 'e1', data: { kind: 'skill', skillName: '电涌过载', damage: 28 } },
              { seq: 1, round: 1, key: 'attackAfter', unitId: 'e1', sourceId: 'e1', targetId: 'nova', data: { kind: 'attack', damage: 6 } },
              { seq: 2, round: 2, key: 'healingTaken', unitId: 'nova', sourceId: 'nova', targetId: 'nova', data: { kind: 'heal', skillName: '净化之泉', amount: 76 } }
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

    fireEvent.click(screen.getByText(/战斗挂机/));

    // 事件流日志：技能行含技能名与伤害；治疗行含恢复量
    const skillLine = screen.getByText(/发动【电涌过载】/);
    expect(skillLine.textContent).toContain('-28');
    expect(screen.getByText(/恢复 76 点生命/)).toBeDefined();
  });

  it('settles idle battle online and shows the latest battle result (挂机战斗在线结算)', () => {
    vi.useFakeTimers();
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    // 强队保证必胜（诺娃 + 铁卫）
    save.heroes = { nova: createInitialHero('nova'), soldier: createInitialHero('soldier') };
    save.party = ['nova', 'soldier'];
    save.stamina = COMBAT_CONFIG.maxStamina;
    save.combat.zonesCleared = ['wasteland_entrance'];
    save.combat.lastSettlement = null;
    save.combat.idle = { zoneId: 'wasteland_entrance', startTime: Date.now(), accumulatedSeconds: 0 };
    save.lastTick = Date.now(); // 无离线结算，从零开始在线推进
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/战斗挂机/));

    // 挂机在线结算一场（20 秒），最近战斗结果以事件流展示
    act(() => {
      vi.advanceTimersByTime(21000);
    });
    expect(screen.getAllByText(/战斗胜利！/).length).toBeGreaterThan(0);
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat.lastSettlement.battle.outcome).toBe('victory');

    vi.useRealTimers();
  });

  it('shows the latest battle result for consecutive battles (连续战斗更新事件流)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/战斗挂机/));

    // 第一场：点击开战 → 胜利结算展示
    fireEvent.click(screen.getAllByText(/开战（体力 -10）/)[0]);
    expect(screen.getAllByText(/战斗胜利！/).length).toBeGreaterThan(0);
    const afterFirst = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(afterFirst.stamina).toBe(90);

    // 第二场（内容与第一场完全相同）：点击开战 → 最新一场仍为胜利
    fireEvent.click(screen.getAllByText(/开战（体力 -10）/)[0]);
    expect(screen.getAllByText(/战斗胜利！/).length).toBeGreaterThan(0);
    const afterSecond = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(afterSecond.stamina).toBe(80);
  });
});
