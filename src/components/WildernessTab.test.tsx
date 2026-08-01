import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import WildernessTab from './WildernessTab';

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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
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

  it('should apply raw event HP penalty without survivor passives (retired)', async () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
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
    expect(savedState.player.hp).toBe(90); // 被动退役后无减免，HP 原样扣除 10
  });

  it('should gather raw scrap metal without Buster bonus (retired)', async () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // 强制选择第一个事件 ruined_truck

    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
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

    // 初始队伍 = 诺娃，满体力 100 → 可开战（体力 -10）
    fireEvent.click(screen.getByText(/开战（体力 -10）/));

    // 胜利结算展示 + 体力扣减 + 结算写入存档
    expect(screen.getByText(/✅ 战斗胜利/)).toBeDefined();
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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false },
        soldier: { level: 1, exp: 0, hp: 160, maxHp: 160, star: 1, wounded: false }
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

    // 胜利 → 继续探索：下一张卡牌出现、步数 +1、遭遇清除
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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false }
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

    // 战败 → 探索终止回到荒野入口，战利品并入库存，小队重伤
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
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: {
        nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false }
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

  it('renders a draw settlement as 平局 rather than defeat (三态结算展示)', () => {
    // 水合一个平局结算（victory=false 且 partyWiped=false），当前数据下无法自然产生
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      heroes: { nova: { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false } },
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
    expect(screen.getByText(/⚔️ 战斗平局/)).toBeDefined();
    expect(screen.queryByText(/💥 战斗失败/)).toBeNull();
    expect(screen.getByText(/鏖战至回合上限未分胜负/)).toBeDefined();
  });
});
