// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { BattleModal } from './BattleModal';
import { REGION_CONFIGS } from '../configs/loaders/regions.loader';
import type { GameState, CombatSettlement } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

const makeTestState = (): GameState => {
  const state: GameState = JSON.parse(JSON.stringify(INITIAL_STATE));
  state.party = ['nova'];
  state.heroes.nova = {
    ...createInitialHero('nova'),
    level: 5,
    wounded: false
  };
  state.stamina = 50;
  state.exploration.regionProgress = { wasteland_entrance: 10 };
  return state;
};

const makeMockSettlement = (victory: boolean = true): CombatSettlement => ({
  battle: {
    outcome: victory ? 'victory' : 'defeat',
    victory,
    partyWiped: !victory,
    rounds: 2,
    events: [
      {
        seq: 0,
        round: 1,
        key: 'roundStart',
        unitId: null,
        sourceId: null,
        targetId: null,
        unitName: null,
        sourceName: null,
        targetName: null,
        data: {}
      },
      {
        seq: 1,
        round: 1,
        key: 'attackAfter',
        unitId: 'nova',
        sourceId: 'nova',
        sourceName: '诺娃',
        targetId: 'wasteland_hound_0',
        targetName: '废土鬣狗',
        unitName: '诺娃',
        data: { kind: 'attack', damage: 50, isCrit: true }
      },
      {
        seq: 2,
        round: 2,
        key: 'death',
        unitId: 'wasteland_hound_0',
        unitName: '废土鬣狗',
        sourceId: null,
        targetId: null,
        sourceName: null,
        targetName: null,
        data: {}
      }
    ]
  },
  drops: { scrap_metal: 2 },
  soulEchoes: 5,
  expPerHero: 20,
  woundedHeroIds: victory ? [] : ['nova']
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('BattleModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders dedicated battle modal with 6 hero slots, 6 enemy slots, speed 1x and round info', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const settlement = makeMockSettlement(true);
    const onClose = vi.fn();

    renderWithProviders(
      <BattleModal
        isOpen={true}
        regionId="wasteland_entrance"
        levelId={level.id}
        level={level}
        settlement={settlement}
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();
    expect(screen.getByText(/废土边缘/)).toBeDefined();
    expect(screen.getByText(/第 1\/\d+ 轮/)).toBeDefined();
    expect(screen.getByTestId('speed-toggle-btn').textContent).toContain('1x');
    expect(screen.getByTestId('skip-battle-btn')).toBeDefined();
    expect(screen.getByTestId('exit-battle-btn')).toBeDefined();

    // Hero slot 1 has Nova
    expect(screen.getByTestId('battle-unit-nova')).toBeDefined();
    // Empty slots rendered
    expect(screen.getAllByText(/槽位 2/).length).toBeGreaterThanOrEqual(1);
  });

  it('toggles playback speed between 1x and 2x', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const settlement = makeMockSettlement(true);

    renderWithProviders(
      <BattleModal
        isOpen={true}
        regionId="wasteland_entrance"
        levelId={level.id}
        level={level}
        settlement={settlement}
        onClose={vi.fn()}
      />
    );

    const speedBtn = screen.getByTestId('speed-toggle-btn');
    expect(speedBtn.textContent).toContain('1x');

    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toContain('2x');

    fireEvent.click(speedBtn);
    expect(speedBtn.textContent).toContain('1x');
  });

  it('instantly resolves battle on skip and opens settlement popup', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const settlement = makeMockSettlement(true);
    const onClose = vi.fn();

    renderWithProviders(
      <BattleModal
        isOpen={true}
        regionId="wasteland_entrance"
        levelId={level.id}
        level={level}
        settlement={settlement}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('skip-battle-btn'));

    // Settlement popup appears
    const settlementModal = screen.getByTestId('battle-settlement-modal');
    expect(settlementModal).toBeDefined();
    expect(screen.getByText('战斗胜利')).toBeDefined();
    expect(screen.getByText(/废旧金属/)).toBeDefined();

    // Confirm settlement
    fireEvent.click(screen.getByTestId('battle-settlement-confirm-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('prompts forfeit confirmation modal and handles forfeit as defeat', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const settlement = makeMockSettlement(true);
    const onForfeit = vi.fn();

    renderWithProviders(
      <BattleModal
        isOpen={true}
        regionId="wasteland_entrance"
        levelId={level.id}
        level={level}
        settlement={settlement}
        onClose={vi.fn()}
        onForfeit={onForfeit}
      />
    );

    // Click exit
    fireEvent.click(screen.getByTestId('exit-battle-btn'));
    expect(screen.getByTestId('battle-forfeit-modal')).toBeDefined();

    // Cancel exit first
    fireEvent.click(screen.getByTestId('battle-forfeit-cancel-btn'));
    expect(screen.queryByTestId('battle-forfeit-modal')).toBeNull();

    // Click exit again and confirm
    fireEvent.click(screen.getByTestId('exit-battle-btn'));
    fireEvent.click(screen.getByTestId('battle-forfeit-confirm-btn'));

    expect(onForfeit).toHaveBeenCalled();
    // Settlement shows 战斗失败
    expect(screen.getByTestId('battle-settlement-modal')).toBeDefined();
    expect(screen.getByText('战斗失败')).toBeDefined();
  });

  it('hides exit button and displays encounter title when isEncounter is true', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const settlement = makeMockSettlement(true);
    const encounterLevel = {
      id: 'encounter_wasteland_pack',
      name: '遭遇战 · 废土鬣狗群',
      staminaCost: 10,
      enemies: ['wasteland_hound', 'mutant_rat'],
      drops: []
    };

    renderWithProviders(
      <BattleModal
        isOpen={true}
        settlement={settlement}
        level={encounterLevel}
        isEncounter={true}
        encounterTitle="遭遇战 · 废土鬣狗群"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('dedicated-battle-modal')).toBeDefined();
    expect(screen.getByText(/遭遇战 · 废土鬣狗群/)).toBeDefined();
    // Exit button strictly hidden
    expect(screen.queryByTestId('exit-battle-btn')).toBeNull();
    // Speed and skip still available
    expect(screen.getByTestId('speed-toggle-btn')).toBeDefined();
    expect(screen.getByTestId('skip-battle-btn')).toBeDefined();
  });
});
