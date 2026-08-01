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

    // 诺娃同时出现在上阵队伍槽位与英雄列表中
    expect(screen.getAllByText(/诺娃/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/进攻者/).length).toBeGreaterThan(0); // 职阶徽章 + 天赋主干分组
    expect(screen.getByText(/机械/)).toBeDefined();
    expect(screen.getByText(/Lv\.1/)).toBeDefined();
    expect(screen.getByText(/已解锁 1 位英雄/)).toBeDefined();
  });

  it('shows the default party slot with the starter hero and a 下阵 button', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/上阵队伍/)).toBeDefined();
    expect(screen.getByText(/⬇ 下阵/)).toBeDefined();
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
    // 预置：诺娃重伤 + 背包 1 支纳米修复剂
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

    const healButton = screen.getByText(/💉 治愈重伤/);
    expect(healButton).toBeDefined();
    fireEvent.click(healButton);

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.inventory.nanite_injector).toBe(0);
    expect(saved.heroes.nova.wounded).toBe(false);
    expect(saved.heroes.nova.hp).toBe(saved.heroes.nova.maxHp);
  });

  it('disables the heal button without a nanite_injector', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.nanite_injector = 0;
    save.heroes.nova = { ...createInitialHero('nova'), hp: 0, wounded: true };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    const healButton = screen.getByText(/💉 治愈重伤/);
    expect(healButton.hasAttribute('disabled')).toBe(true);
  });

  it('equips a weapon from inventory into the weapon slot (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.ember_weapon = 1;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 打开武器槽位的候选装备列表并穿戴
    fireEvent.click(screen.getAllByText('装备')[0]);
    fireEvent.click(screen.getByText(/余烬长刃/));

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon).toEqual({ itemId: 'ember_weapon', enhance: 0, mythic: false });
    expect(saved.inventory.ember_weapon).toBe(0);
    // 穿戴后展示装备名（槽位 + 提示 toast）与强化按钮
    expect(screen.getAllByText(/余烬长刃/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\+0/)).toBeDefined();
  });

  it('enhances an equipped weapon consuming enhance stones (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.enhance_stone = 5;
    save.equipment = { nova: { weapon: { itemId: 'wasteland_weapon', enhance: 0, mythic: false }, armor: null, trinket: null } };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getByText(/强化 \+1/));

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon.enhance).toBe(1);
    expect(saved.inventory.enhance_stone).toBe(4);
    expect(screen.getAllByText(/废土利刃/).length).toBeGreaterThan(0);
  });

  it('requires confirmation before unequipping an enhanced item (ticket 10)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.equipment = { nova: { weapon: { itemId: 'wasteland_weapon', enhance: 12, mythic: false }, armor: null, trinket: null } };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 第一次点击进入确认态，装备未卸下
    fireEvent.click(screen.getByText('卸下'));
    expect(screen.getByText(/确认卸下？/)).toBeDefined();
    let saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon.enhance).toBe(12);
    expect(saved.inventory.wasteland_weapon).toBeUndefined();

    // 第二次点击真正卸下（强化重置为背包计数）
    fireEvent.click(screen.getByText(/确认卸下？/));
    saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.equipment.nova.weapon).toBeNull();
    expect(saved.inventory.wasteland_weapon).toBe(1);
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

    fireEvent.click(screen.getAllByText('详情面板 ›')[0]);
    fireEvent.click(screen.getByText('天赋树入口'));

    // 职阶主干与英雄专属分组可见；第一个 + 属于主干首节点「锋芒毕露」
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

    fireEvent.click(screen.getAllByText('详情面板 ›')[0]);
    fireEvent.click(screen.getByText('天赋树入口'));

    fireEvent.click(screen.getByText('重置'));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.talentPoints).toBe(3);
    expect(saved.heroes.nova.talents).toEqual({});
  });

  it('star-up consumes soul shards and raises the star level (ticket 12)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.soulShards = { nova: 10 };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    fireEvent.click(screen.getAllByText('详情面板 ›')[0]);
    fireEvent.click(screen.getByText(/⭐ 升星/));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.star).toBe(2);
    expect(saved.soulShards.nova).toBe(5); // cost(1) = 5
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

    fireEvent.click(screen.getAllByText('详情面板 ›')[0]);
    fireEvent.click(screen.getByText(/🌟 觉醒/));
    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.awakened).toBe(true);
    expect(saved.inventory.arcane_orb).toBe(0);
    // 觉醒后展示新名字
    expect(screen.getAllByText(/觉醒·诺娃/).length).toBeGreaterThan(0);
  });
});
