// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import IdleCombatWidget from './IdleCombatWidget';
import { INITIAL_STATE, createInitialHero } from '../configs/seed/initialState';

describe('IdleCombatWidget Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders idle dashboard with region/level title, battle count, timer, and cumulative drops', () => {
    const now = 1700000000000;
    const startTime = now - 65000; // 01:05
    vi.setSystemTime(now);

    const testState = {
      ...INITIAL_STATE,
      heroes: {
        nova: createInitialHero('nova')
      },
      party: ['nova'],
      combat: {
        ...INITIAL_STATE.combat,
        clearedLevels: { wasteland_entrance: ['wasteland_entrance_1'] },
        idle: {
          regionId: 'wasteland_entrance',
          levelId: 'wasteland_entrance_1',
          startTime,
          accumulatedSeconds: 5,
          totalBattles: 4,
          totalVictories: 4,
          totalDefeats: 0,
          totalDraws: 0,
          totalDrops: { scrap_metal: 8, glow_fiber: 2 },
          totalSoulEchoes: 40
        }
      },
      logs: [
        {
          id: 'log_1',
          text: '战斗胜利！小队在【废土边缘 · 荒野哨所】击退敌人，获得 废铁×2。',
          timestamp: startTime + 10000,
          type: 'combat' as const
        }
      ]
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testState));

    const onStopMock = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <IdleCombatWidget
            regionId="wasteland_entrance"
            levelId="wasteland_entrance_1"
            onStop={onStopMock}
          />
        </ToastProvider>
      </GameProvider>
    );

    // 标题展示区域与关卡
    expect(screen.getByTestId('idle-widget-title').textContent).toContain('废土边缘');
    expect(screen.getByTestId('idle-widget-title').textContent).toContain('废土边缘 · 游荡者');

    // 战斗场次
    expect(screen.getByText('4')).toBeDefined();

    // 累计战利品展示
    const dropsText = screen.getByTestId('idle-widget-drops').textContent;
    expect(dropsText).toContain('废旧金属');
    expect(dropsText).toContain('8');
    expect(dropsText).toContain('荧光草纤维');
    expect(dropsText).toContain('2');
    expect(dropsText).toContain('灵魂残响');
    expect(dropsText).toContain('40');

    // 实时事件流窗口中显示初始循环战况
    expect(screen.getByText(/队伍进入持续战斗循环/)).toBeDefined();
  });

  it('invokes stopLevelIdle and onStop callback with summary data when clicking stop button', () => {
    const now = 1700000000000;
    const startTime = now - 90000;
    vi.setSystemTime(now);

    const testState = {
      ...INITIAL_STATE,
      heroes: {
        nova: createInitialHero('nova')
      },
      party: ['nova'],
      combat: {
        ...INITIAL_STATE.combat,
        clearedLevels: { wasteland_entrance: ['wasteland_entrance_1'] },
        idle: {
          regionId: 'wasteland_entrance',
          levelId: 'wasteland_entrance_1',
          startTime,
          accumulatedSeconds: 0,
          totalBattles: 6,
          totalVictories: 6,
          totalDefeats: 0,
          totalDraws: 0,
          totalDrops: { scrap_metal: 12 },
          totalSoulEchoes: 60
        }
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testState));

    const onStopMock = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <IdleCombatWidget
            regionId="wasteland_entrance"
            levelId="wasteland_entrance_1"
            onStop={onStopMock}
          />
        </ToastProvider>
      </GameProvider>
    );

    const stopBtn = screen.getByTestId('idle-widget-stop-btn');
    fireEvent.click(stopBtn);

    expect(onStopMock).toHaveBeenCalledTimes(1);
    const summary = onStopMock.mock.calls[0][0];
    expect(summary).toBeDefined();
    expect(summary.totalBattles).toBe(6);
    expect(summary.totalDrops.scrap_metal).toBe(12);
    expect(summary.totalSoulEchoes).toBe(60);

    // 验证状态已停止
    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.combat.idle.regionId).toBeNull();
  });
});
