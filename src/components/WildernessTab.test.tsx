// @vitest-environment jsdom
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
    const save = JSON.parse(JSON.stringify(INITIAL_STATE));
    save.exploration.regionProgress = {
      wasteland_entrance: 10
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.05);
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // 打开区域选择器切换到旧城废墟
    fireEvent.click(screen.getByTestId('wilderness-region-card'));
    fireEvent.click(screen.getByTestId('region-item-old_town_ruins'));
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

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
    const save = JSON.parse(JSON.stringify(INITIAL_STATE));
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // 切换到战斗模式
    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    expect(screen.getAllByText(/废土边缘/).length).toBeGreaterThan(0);
    expect(screen.getByText(/战斗体力/)).toBeDefined();

    // 点击第 1 关卡片唤起 LevelDetailModal
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));
    expect(screen.getByTestId('level-detail-modal')).toBeDefined();

    // 点击【确认】开战 → 打开专属全屏战斗模态 BattleModal
    fireEvent.click(screen.getByTestId('level-detail-confirm-btn'));
    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();

    // 跳过直达结算并验证战果与体力扣减
    fireEvent.click(screen.getByTestId('skip-battle-btn'));
    expect(screen.getByText(/战斗胜利/)).toBeDefined();
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.stamina).toBe(90);
    expect(savedState.combat.regionId).toBe('wasteland_entrance');
    expect(savedState.combat.levelId).toBe('wasteland_entrance_1');
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);
  });

  it('blocks battle when stamina is insufficient', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE));
    save.stamina = 0;
    save.lastTick = Date.now();
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(confirmBtn);
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat?.lastSettlement).toBeNull(); // 体力不足未开战
    expect(savedState.stamina).toBeLessThan(1);
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

    // 遭遇场景：点击迎战进入全屏专属战斗模态 BattleModal
    expect(screen.getByText(/战斗遭遇 —— 废土掠食者群/)).toBeDefined();
    fireEvent.click(screen.getByText(/迎战！（体力/));

    // 专属战斗场景唤起：退出按钮严格隐藏
    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();
    expect(screen.queryByTestId('exit-battle-btn')).toBeNull();

    // 跳过直达结算
    fireEvent.click(screen.getByTestId('skip-battle-btn'));
    expect(screen.getByTestId('battle-settlement-modal')).toBeDefined();
    expect(screen.getByText('战斗胜利')).toBeDefined();

    // 确认结算：关闭模态，无缝继续推进探索流程
    fireEvent.click(screen.getByTestId('battle-settlement-confirm-btn'));
    expect(screen.getByText(/废弃的魔导卡车/)).toBeDefined();
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realitySteps).toBe(2);
    expect(savedState.exploration.realityEncounterId).toBeNull();
    expect(savedState.exploration.inRealityExploration).toBe(true);
    // 掉落入探索背囊（DropEntry：scrap 2 + 2，glow 2）
    expect(savedState.exploration.realityBag.scrap_metal).toBe(4);
    expect(savedState.exploration.realityBag.glow_fiber).toBe(2);
    // 经验入账；探索遭遇消耗独立体力（100 - 5）
    expect(savedState.heroes.nova.exp).toBe(15);
    expect(savedState.stamina).toBe(95);
    // 同一战斗场景：结算记录
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);

    randomSpy.mockRestore();
  });

  it('resolves a combat encounter defeat: exploration ends, loot merged into inventory, party wounded', () => {
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
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

    // 遭遇战模态唤起：退出按钮严格隐藏
    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();
    expect(screen.queryByTestId('exit-battle-btn')).toBeNull();

    // 跳过直达结算：战败结算
    fireEvent.click(screen.getByTestId('skip-battle-btn'));
    expect(screen.getByTestId('battle-settlement-modal')).toBeDefined();
    expect(screen.getByText('战斗失败')).toBeDefined();

    // 确认结算：离开模态，探索终止回到荒野入口
    fireEvent.click(screen.getByTestId('battle-settlement-confirm-btn'));
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
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    expect(screen.getByText(/鬣狗王/)).toBeDefined(); // 关卡网格显示纯关卡名（U#3 方案 A）

    // 单诺娃挑战区1 关底（末位关卡）→ 点击关卡卡片并确认开战 → 胜利通关
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_2'));
    expect(screen.getByTestId('level-detail-modal')).toBeDefined();
    fireEvent.click(screen.getByTestId('level-detail-confirm-btn'));

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat.lastSettlement.battle.victory).toBe(true);
    expect(savedState.combat.clearedLevels.wasteland_entrance).toContain('wasteland_entrance_2');
    expect(savedState.stamina).toBe(100 - 12); // 关底战消耗体力
    expect(screen.getAllByText(/^已通关$/).length).toBeGreaterThan(0);
  });

  it('arms idle from the combat panel in a cleared zone and stops it preserving stamina (挂机需已通关)', () => {
    // 挂机仅限已通关区域/关卡
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    // 切换到挂机模式
    fireEvent.click(screen.getByTestId('combat-mode-idle-btn'));

    // 首区第 1 关已通关可挂机
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));
    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirmBtn);

    // 挂机状态出现：开启挂机检验体力阈值（不提前扣除），战斗结算时逐场扣除
    expect(screen.getByText(/挂机中：/)).toBeDefined();
    expect(screen.getAllByText(/停止挂机/).length).toBeGreaterThan(0);
    let saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.regionId).toBe('wasteland_entrance');
    expect(saved.combat.idle.levelId).toBe('wasteland_entrance_1');
    expect(saved.combat.lastSettlement).toBeNull();
    expect(saved.stamina).toBe(100);

    // 停止挂机：体力保持完整
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
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    fireEvent.click(screen.getByTestId('combat-mode-idle-btn'));
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(confirmBtn);

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat?.idle?.regionId).toBeNull(); // 体力不足未开启挂机
  });

  it('renders region selector card and mode toggle in combat panel', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    expect(screen.getByTestId('combat-region-card')).toBeDefined();
    expect(screen.getByTestId('combat-mode-active-btn')).toBeDefined();
    expect(screen.getByTestId('combat-mode-idle-btn')).toBeDefined();
    expect(screen.getByTestId('level-browser-grid')).toBeDefined();
  });

  it('settles idle battle online and shows the latest battle result (挂机战斗在线结算)', () => {
    vi.useFakeTimers();
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    // 强队保证必胜（诺娃 + 铁卫）
    save.heroes = { nova: createInitialHero('nova'), soldier: createInitialHero('soldier') };
    save.party = ['nova', 'soldier'];
    save.stamina = COMBAT_CONFIG.maxStamina;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    save.combat.lastSettlement = null;
    save.combat.idle = { regionId: 'wasteland_entrance', levelId: 'wasteland_entrance_1', startTime: Date.now(), accumulatedSeconds: 0 };
    save.lastTick = Date.now(); // 无离线结算，从零开始在线推进
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    // 挂机在线结算一场（20 秒），状态中记录胜利结算
    act(() => {
      vi.advanceTimersByTime(21000);
    });
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.combat.lastSettlement.battle.outcome).toBe('victory');

    vi.useRealTimers();
  });

  it('shows the battle modal and consumes stamina for consecutive battles (连续战斗更新结算与体力)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    // 第一场：点击关卡卡片 -> 确认开战 → 进入全屏战斗模态并结算
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));
    fireEvent.click(screen.getByTestId('level-detail-confirm-btn'));
    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();

    fireEvent.click(screen.getByTestId('skip-battle-btn'));
    fireEvent.click(screen.getByTestId('battle-settlement-confirm-btn'));

    const afterFirst = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(afterFirst.stamina).toBe(90);

    // 第二场：再次点击关卡卡片 -> 确认开战 → 进入战斗并再次扣减体力
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));
    fireEvent.click(screen.getByTestId('level-detail-confirm-btn'));
    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();

    fireEvent.click(screen.getByTestId('skip-battle-btn'));
    fireEvent.click(screen.getByTestId('battle-settlement-confirm-btn'));

    const afterSecond = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(afterSecond.stamina).toBe(80);
  });

  it('switches between 荒野 and 战斗 sub-tabs seamlessly', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // Initial state is Wilderness sub-tab
    expect(screen.getByTestId('wilderness-region-card')).toBeDefined();
    expect(screen.getByText('踏入废土荒野')).toBeDefined();

    // Switch to Combat sub-tab
    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    expect(screen.getByTestId('combat-region-card')).toBeDefined();
    expect(screen.getByText(/战斗体力/)).toBeDefined();

    // Switch back to Wilderness sub-tab
    fireEvent.click(screen.getByRole('button', { name: '荒野' }));
    expect(screen.getByTestId('wilderness-region-card')).toBeDefined();
  });

  it('opens RegionSelectorModal from wilderness region card and updates selection', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // Click wilderness region card
    fireEvent.click(screen.getByTestId('wilderness-region-card'));
    expect(screen.getByTestId('region-selector-modal')).toBeDefined();

    // Select old_town_ruins (unlocked now in exploration)
    fireEvent.click(screen.getByTestId('region-item-old_town_ruins'));
    expect(screen.getByTestId('region-detail-modal')).toBeDefined();

    // Confirm selection
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.queryByTestId('region-selector-modal')).toBeNull();

    // Wilderness card now reflects 旧城废墟
    expect(screen.getByTestId('wilderness-region-card').textContent).toContain('旧城废墟');
  });

  it('opens RegionSelectorModal from combat region card and updates combat region', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10, old_town_ruins: 15 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    // Go to combat sub-tab
    fireEvent.click(screen.getByRole('button', { name: '战斗' }));
    expect(screen.getByTestId('combat-region-card')).toBeDefined();

    // Click combat region card
    fireEvent.click(screen.getByTestId('combat-region-card'));
    expect(screen.getByTestId('region-selector-modal')).toBeDefined();

    // Select old_town_ruins (unlocked in combat)
    fireEvent.click(screen.getByTestId('region-item-old_town_ruins'));
    expect(screen.getByTestId('region-detail-modal')).toBeDefined();

    // Confirm selection
    fireEvent.click(screen.getByRole('button', { name: '确认' }));
    expect(screen.queryByTestId('region-selector-modal')).toBeNull();

    // Combat card now reflects 旧城废墟
    expect(screen.getByTestId('combat-region-card').textContent).toContain('旧城废墟');
  });

  it('switches between 挑战 and 挂机 modes and opens LevelDetailModal with cancel behavior', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    // Challenge mode (active): card 1 is 已通关, card 2 is 可挑战
    const card1 = screen.getByTestId('level-card-wasteland_entrance_1');
    const card2 = screen.getByTestId('level-card-wasteland_entrance_2');
    expect(card1.textContent).toContain('已通关');
    expect(card2.textContent).toContain('可挑战');

    // Switch to Idle mode (挂机)
    fireEvent.click(screen.getByTestId('combat-mode-idle-btn'));
    expect(card1.textContent).toContain('可挂机');
    expect(card2.textContent).toContain('未解锁');

    // Click card 1 to open LevelDetailModal
    fireEvent.click(card1);
    expect(screen.getByTestId('level-detail-modal')).toBeDefined();
    expect(screen.getByText('敌方阵容')).toBeDefined();

    // Click cancel button -> closes modal
    fireEvent.click(screen.getByTestId('level-detail-cancel-btn'));
    expect(screen.queryByTestId('level-detail-modal')).toBeNull();
  });

  it('starts idle combat from LevelDetailModal in 挂机 mode, renders IdleCombatWidget, stops with IdleSummaryModal, and returns to 挂机 mode', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.exploration.regionProgress = { wasteland_entrance: 10 };
    save.combat.clearedLevels = { wasteland_entrance: ['wasteland_entrance_1'] };
    save.heroes = { nova: createInitialHero('nova') };
    save.party = ['nova'];
    save.stamina = 100;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <WildernessTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '战斗' }));

    // Switch to Idle mode
    fireEvent.click(screen.getByTestId('combat-mode-idle-btn'));

    // Open cleared level modal and confirm starting idle
    fireEvent.click(screen.getByTestId('level-card-wasteland_entrance_1'));
    expect(screen.getByTestId('level-detail-modal')).toBeDefined();
    fireEvent.click(screen.getByTestId('level-detail-confirm-btn'));

    // View seamlessly switches to IdleCombatWidget; level list and mode toggles are hidden
    expect(screen.getByTestId('idle-combat-widget')).toBeDefined();
    expect(screen.queryByTestId('combat-mode-active-btn')).toBeNull();
    expect(screen.queryByTestId('combat-region-card')).toBeNull();

    // Click stop button on widget -> triggers IdleSummaryModal
    fireEvent.click(screen.getByTestId('idle-widget-stop-btn'));
    expect(screen.getByTestId('idle-summary-modal')).toBeDefined();
    expect(screen.getByText('挂机已停止')).toBeDefined();

    // Confirm summary modal -> closes modal and stays in 挂机 mode
    fireEvent.click(screen.getByTestId('idle-summary-confirm-btn'));
    expect(screen.queryByTestId('idle-summary-modal')).toBeNull();
    expect(screen.getByTestId('combat-mode-idle-btn')).toBeDefined();
    expect(screen.getByTestId('combat-region-card')).toBeDefined();
  });
});

