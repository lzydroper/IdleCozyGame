// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import HeroTab from './HeroTab';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

describe('HeroTab Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders the starter hero Nova with class, faction and level', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 诺娃出现在上阵队伍槽位中，顶部展示【招募】与【英雄列表】按钮
    expect(screen.getAllByText(/诺娃/).length).toBeGreaterThan(0);
    expect(screen.getByText(/招募/)).toBeDefined();
    expect(screen.getByText(/英雄列表/)).toBeDefined();
  });

  it('shows the default party slot with the starter hero', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/上阵队伍/)).toBeDefined();
    expect(screen.getAllByText(/诺娃/).length).toBeGreaterThan(0);
  });

  it('shows the active bond for the party in the 上阵队伍 section (羁绊生效可见)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.roy = createInitialHero('roy');
    save.party = ['nova', 'roy'];
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 机械搭档（诺娃 + 罗伊）：攻击 +10%
    expect(screen.getByText(/机械搭档/)).toBeDefined();
    expect(screen.getByText(/攻击 \+10%/)).toBeDefined();
  });

  it('hints that no bond is triggered for a non-matching party', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 默认队伍仅诺娃 → 未触发任何羁绊
    expect(screen.getByText(/未触发羁绊/)).toBeDefined();
  });

  it('heals a wounded hero by consuming one nanite_injector', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.nanite_injector = 1;
    save.heroes.nova = { ...createInitialHero('nova'), hp: 0, wounded: true };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getAllByText(/诺娃/).length).toBeGreaterThan(0);
  });

  it('equips a weapon from equipment inventory into the weapon slot via HeroDetailModal (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.equipmentInventory = { ember_weapon: [{ itemId: 'ember_weapon', enhance: 0, mythic: false }] };
    save.equipment = { nova: { weapon: null, armor: null, trinket: null } };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText('一键装备'));

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon).toEqual({ itemId: 'ember_weapon', enhance: 0, mythic: false });
    expect(saved.equipmentInventory.ember_weapon?.length ?? 0).toBe(0);
  });

  it('unequips all equipped items via HeroDetailModal (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.equipment = { nova: { weapon: { itemId: 'wasteland_weapon', enhance: 0, mythic: false }, armor: null, trinket: null } };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText('一键卸下'));

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon).toBeNull();
    // 卸下后装备实例（含强化）返回背包（ADR-0014 修订）
    expect(saved.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 0, mythic: false }]);
  });

  it('allocates a talent point into the class trunk via the panel (ticket 11)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova.talentPoints = 3;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText('天赋树入口'));

    expect(screen.getByText(/【进攻者 · 职阶主干】/)).toBeDefined();
    expect(screen.getByText(/【英雄专属】/)).toBeDefined();
    fireEvent.click(screen.getAllByText('+')[0]);

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.talentPoints).toBe(2);
    expect(saved.heroes.nova.talents.trunk_attacker_edge).toBe(1);
    expect(screen.getByText(/当前加成：攻击 \+3%/)).toBeDefined();
  });

  it('resets all invested talent points (ticket 11)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova.talentPoints = 1;
    save.heroes.nova.talents = { trunk_attacker_edge: 2 };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText('天赋树入口'));

    fireEvent.click(screen.getByText('重置'));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.talentPoints).toBe(3);
    expect(saved.heroes.nova.talents).toEqual({});
  });

  it('star-up consumes soul shards and raises the star level (ticket 12)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.shard_nova = 10;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText(/升星/));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.star).toBe(2);
    expect(saved.inventory.shard_nova).toBe(5); // cost(1) = 5
  });

  it('awakens a max-star hero consuming the arcane orb (ticket 12)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova = { ...createInitialHero('nova'), star: 5, awakened: false };
    save.inventory.arcane_orb = 1;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));
    fireEvent.click(screen.getByText(/觉醒/));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.awakened).toBe(true);
    expect(saved.inventory.arcane_orb).toBe(0);
    expect(screen.getAllByText(/觉醒·诺娃/).length).toBeGreaterThan(0);
  });

  it('opens the hero dossier from the duty card (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));

    // 后勤驻守特长卡片 → 英雄档案弹窗
    fireEvent.click(screen.getByText('后勤驻守特长'));
    expect(screen.getByText('英雄档案')).toBeDefined();
    expect(screen.getByText(/职阶 · 进攻者/)).toBeDefined();
    expect(screen.getByText(/阵营 · 机械/)).toBeDefined();

    // 关闭
    fireEvent.click(screen.getByTitle('关闭'));
    expect(screen.queryByText('英雄档案')).toBeNull();
  });

  it('level-up consumes one exp_tome instead of free leveling (ticket 15)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.exp_tome = 1;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText('英雄列表'));
    fireEvent.click(screen.getByTestId('hero-card-nova'));

    const before = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(before.heroes.nova.level).toBe(1);

    fireEvent.click(screen.getByText('升级'));

    const after = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(after.heroes.nova.level).toBe(2);
    expect(after.inventory.exp_tome).toBe(0);
  });
});
