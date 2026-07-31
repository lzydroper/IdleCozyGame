import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import WildernessTab from './WildernessTab';

describe('WildernessTab Component', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
