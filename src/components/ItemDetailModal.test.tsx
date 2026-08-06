// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ItemDetailModal from './ItemDetailModal';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import type { HeroState, PlayerStats } from '../types/game';

describe('ItemDetailModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderModal = (
    itemId: string,
    onClose = () => {},
    overrides?: { player?: Partial<PlayerStats>; inventory?: Record<string, number>; dreamPollution?: number; heroes?: Record<string, HeroState>; equipment?: Record<string, { weapon: import('../types/game').EquippedItem | null; armor: import('../types/game').EquippedItem | null; trinket: import('../types/game').EquippedItem | null }> }
  ) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = { ...save.inventory, ration: 5, ...overrides?.inventory };
    if (overrides?.player) save.player = { ...save.player, ...overrides.player };
    if (overrides?.dreamPollution !== undefined) save.exploration.dreamPollution = overrides.dreamPollution;
    if (overrides?.heroes) save.heroes = overrides.heroes;
    if (overrides?.equipment) save.equipment = overrides.equipment;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <ItemDetailModal itemId={itemId} onClose={onClose} />
        </ToastProvider>
      </GameProvider>
    );
  };

  const slider = () => screen.getByTestId('use-count-slider') as HTMLInputElement;
  const useButton = () => screen.getByTestId('use-item-button') as HTMLButtonElement;
  const effectText = () => screen.getByTestId('use-effect-text').textContent ?? '';

  it('renders item name, held quantity and description', () => {
    renderModal('ration');

    expect(screen.getByText('压缩口粮')).toBeDefined();
    expect(screen.getByText('持有 ×5')).toBeDefined();
    expect(screen.getByText('高热量压缩食物')).toBeDefined();
  });

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByLabelText('关闭详情'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByTestId('item-detail-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal container', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByTestId('item-detail-container'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to the raw id when the item has no config', () => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = { ...save.inventory, unknown_gadget: 1 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <ItemDetailModal itemId="unknown_gadget" onClose={() => {}} />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText('unknown_gadget')).toBeDefined();
    expect(screen.getByText('持有 ×1')).toBeDefined();
  });

  // === 使用区（ticket 03：恢复类道具批量使用） ===

  it('starts slider at 0 and keeps use button disabled until a count is selected', () => {
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 2 } });

    expect(slider().value).toBe('0');
    expect(slider().max).toBe('2');
    expect(useButton().disabled).toBe(true);
    expect(effectText()).toContain('请选择使用数量');
  });

  it('shows use slider for restorative items with capacity-capped max (ticket 03)', () => {
    // 饱食度 81/100、口粮 +30、拥有 20 → 容量 = ceil(19/30) = 1（最后一个部分生效 +19 到满）
    renderModal('ration', () => {}, { player: { food: 81 }, inventory: { ration: 20 } });
    expect(slider().max).toBe('1');
  });

  it('caps slider max by owned qty when capacity allows more (ticket 03)', () => {
    // 饱食度 10/100、口粮 +30、拥有 2 → 容量 ceil(90/30)=3 → 上限 = min(2, 3) = 2
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 2 } });
    expect(slider().max).toBe('2');
  });

  it('shows actual effective value with cap instead of nominal (ticket 03)', () => {
    // 81/100 + 30 → 实际 +19（已满 100）
    renderModal('ration', () => {}, { player: { food: 81 }, inventory: { ration: 20 } });
    fireEvent.change(slider(), { target: { value: '1' } });

    expect(effectText()).toContain('+19');
    expect(effectText()).toContain('已满');
    expect(effectText()).not.toContain('+30');
  });

  it('uses batch qty, stays open and updates slider in real time (ticket 03)', () => {
    // 10/100 + 口粮×2 = 70；拥有 3 → 用 2 剩 1
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 3 } });
    fireEvent.change(slider(), { target: { value: '2' } });
    expect(effectText()).toContain('+60'); // 滑到 2 预览：+60

    fireEvent.click(useButton());

    // 弹窗停留、持有数量实时更新为 1（3-2）、滑条上限收窄为 1、计数重置为未选
    expect(screen.getByText('持有 ×1')).toBeDefined();
    expect(slider().max).toBe('1');
    expect(slider().value).toBe('0');
    expect(effectText()).toContain('请选择使用数量');
  });

  it('disables use button when qty runs out (ticket 03)', () => {
    // 拥有 1：滑到 1 使用 → qty 0 → 按钮禁用
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 1 } });
    fireEvent.change(slider(), { target: { value: '1' } });
    fireEvent.click(useButton());

    expect(screen.getByText('持有 ×0')).toBeDefined();
    expect(useButton().disabled).toBe(true);
    expect(effectText()).toContain('物品已用完');
  });

  it('shows combined effect text for multi-effect items (ticket 03)', () => {
    // 血清：理智 +30、污染 -30（dreamPollution 50）
    renderModal('purifying_serum', () => {}, { player: { sanity: 40 }, inventory: { purifying_serum: 2 }, dreamPollution: 50 });
    fireEvent.change(slider(), { target: { value: '1' } });

    expect(effectText()).toContain('理智 +30');
    expect(effectText()).toContain('污染 -30');
  });

  it('hides use area for non-restorative items (ticket 03)', () => {
    renderModal('scrap_metal');
    expect(screen.queryByTestId('use-count-slider')).toBeNull();
    expect(screen.queryByTestId('use-item-button')).toBeNull();
  });

  // === 胶囊充能（ticket 04） ===

  it('shows capsule charge slider capped by owned qty without stat cap (ticket 04)', () => {
    renderModal('sanity_capsule', () => {}, { inventory: { sanity_capsule: 5 } });

    expect(slider().max).toBe('5');
    fireEvent.change(slider(), { target: { value: '1' } });
    expect(effectText()).toContain('梦境充能 +1 次');
  });

  it('uses capsules in batch and updates held qty in real time (ticket 04)', () => {
    renderModal('sanity_capsule', () => {}, { inventory: { sanity_capsule: 3 } });
    fireEvent.change(slider(), { target: { value: '2' } });
    expect(effectText()).toContain('梦境充能 +2 次');

    fireEvent.click(useButton());

    expect(screen.getByText('持有 ×1')).toBeDefined();
    expect(slider().max).toBe('1');
  });

  // === 纳米修复剂治愈（ticket 05） ===

  it('shows heal use button for nanite_injector without slider (ticket 05)', () => {
    renderModal('nanite_injector', () => {}, { inventory: { nanite_injector: 2 } });

    expect(screen.queryByTestId('use-count-slider')).toBeNull();
    expect(screen.queryByTestId('use-effect-text')).toBeNull();
    // 按钮文本与其他道具统一为「使用」
    expect(useButton().textContent).toBe('使用');
  });

  it('disables heal button without injectors (ticket 05)', () => {
    renderModal('nanite_injector', () => {}, { inventory: { nanite_injector: 0 } });
    expect(useButton().disabled).toBe(true);
  });

  it('enables heal button with injectors even without wounded heroes, opening empty state', () => {
    renderModal('nanite_injector', () => {}, { inventory: { nanite_injector: 2 } });

    expect(useButton().disabled).toBe(false);
    fireEvent.click(useButton());
    expect(screen.getByText(/当前没有重伤英雄/)).toBeDefined();
  });

  it('opens hero heal modal on use click when wounded heroes exist (ticket 05)', () => {
    renderModal(
      'nanite_injector',
      () => {},
      {
        inventory: { nanite_injector: 2 },
        heroes: { nova: { ...createInitialHero('nova'), hp: 0, wounded: true } }
      }
    );

    expect(useButton().disabled).toBe(false);
    fireEvent.click(useButton());
    expect(screen.getByTestId('heal-hero-nova')).toBeDefined();
    expect(screen.getByText('诺娃')).toBeDefined();
  });

  // === 装备信息（反馈 4：装备类显示槽位/系列/属性/套装特效/获取途径） ===

  it('shows equipment info (slot/set/stats/enhance/set-tiers/source) for equipment items', () => {
    renderModal('wasteland_weapon', () => {}, { inventory: { wasteland_weapon: 1 } });

    // 装备不可堆叠：不显示「持有 ×N」数量徽章（ADR-0017 实例化）
    expect(screen.queryByText(/持有 ×/)).toBeNull();
    // 槽位 · 系列 · 阵营
    expect(screen.getByText(/武器 · 废土系列/)).toBeDefined();
    // 基础属性与每级强化（span 标签与数值为相邻文本节点，分开断言）
    expect(screen.getByText(/基础属性：/)).toBeDefined();
    expect(screen.getByText('攻击 +10')).toBeDefined();
    expect(screen.getByText(/每 \+1 强化：/)).toBeDefined();
    expect(screen.getByText('攻击 +1')).toBeDefined();
    // 套装特效档位
    expect(screen.getByText(/套装 \+10：攻击 \+5%/)).toBeDefined();
    // 获取途径
    expect(screen.getByText(/获取：工坊合成/)).toBeDefined();
  });

  it('does not show equipment info for non-equipment items', () => {
    renderModal('ration');
    expect(screen.queryByText(/基础属性：/)).toBeNull();
    expect(screen.queryByText(/获取：/)).toBeNull();
  });

  it('shows held instances one-by-one and worn instance stats with enhance (ADR-0017 修订)', () => {
    renderModal('wasteland_weapon', () => {}, {
      inventory: { wasteland_weapon: 1 }, // 经迁移成为 +0 背包实例
      heroes: { nova: { ...createInitialHero('nova'), hp: 100, wounded: false } },
      equipment: {
        nova: { weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false }, armor: null, trinket: null }
      }
    });

    // 背包持有实例逐件列出（不可堆叠）：未强化 · 攻击 +10
    expect(screen.getByText(/背包持有实例：/)).toBeDefined();
    expect(screen.getByText(/未强化 · 攻击 \+10/)).toBeDefined();
    // 已穿戴实例：诺娃 · +10 · 强化后属性（10 + 1×10 = 20，诺娃同机械阵营 ×1.3 = 26）
    expect(document.body.textContent).toContain('诺娃 · +10 · 攻击 +26');
  });
});
