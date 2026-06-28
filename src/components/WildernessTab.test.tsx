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

    expect(screen.getByText(/废土前行步数/i)).toBeDefined();
    expect(screen.getByText(/安全撤退/i)).toBeDefined();
  });

  it('should trigger special rescue event for Catherine at step 5', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        catherine: { id: 'catherine', name: '凯瑟琳', role: 'farmer', bonus: 0.15, isAssigned: false, realityLocationId: 'bio_lab' }
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
        buster: { id: 'buster', name: '巴斯特', role: 'scout', bonus: 0.3, isAssigned: false, realityLocationId: 'collapsed_subway' }
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
        nova: { id: 'nova', name: '诺娃', role: 'engineer', bonus: 0.3, isAssigned: false, realityLocationId: 'military_depot' }
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

  it('should apply Catherine cost reduction passive on events HP and food penalty', async () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: { defensive_turret: 1 },
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        roy: { id: 'roy', name: '罗伊', role: 'engineer', bonus: 0.2, isAssigned: false, realityLocationId: 'radar_station' },
        catherine: { id: 'catherine', name: '凯瑟琳', role: 'farmer', bonus: 0.15, isAssigned: false }
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
    expect(savedState.player.hp).toBe(92); // HP 扣除从原本的 10 折算为 8 (Math.round(-10 * 0.85) = -8)
  });

  it('should apply Buster scrap metal bonus when rescuing and gathering scrap', async () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // 强制选择第一个事件 ruined_truck

    localStorage.setItem('aether_garden_save_Guest', JSON.stringify({
      player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
      inventory: {},
      greenhouse: { slots: [], unlockedSlotsCount: 4 },
      survivors: {
        buster: { id: 'buster', name: '巴斯特', role: 'scout', bonus: 0.3, isAssigned: false }
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

    expect(screen.getByText(/废旧金属 x4/i)).toBeDefined();

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.exploration.realityBag.scrap_metal).toBe(4); // 废金属产出从原本的 3 折算为 4 (Math.round(3 * 1.3) = 4)

    spy.mockRestore();
  });
});
