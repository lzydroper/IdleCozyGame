import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameProvider } from '../../context/GameContext';
import { ToastProvider } from '../ToastSystem';
import WorkshopTab from './WorkshopTab';

describe('WorkshopTab Component', () => {
  it('should render the craft recipes list', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/合成 压缩口粮 ×1/i)).toBeDefined();
    expect(screen.getAllByText(/合成 能量补充剂 ×1/i).length).toBeGreaterThan(0);
  });

  it('hides blueprint-gated recipes until the blueprint is obtained (ticket 03)', () => {
    // 默认存档没有余烬军械图纸 → 余烬配方从列表隐藏（不渲染"未解锁"标记）
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 装备配方在「装备」分类下
    fireEvent.click(screen.getByText('装备'));
    expect(screen.queryByText(/合成 余烬长刃/)).toBeNull();
    expect(screen.queryByText(/未解锁/)).toBeNull();
    // 废土系列无图纸门槛，可直接合成
    expect(screen.getByText(/合成 废土利刃 ×1/)).toBeDefined();
  });

  it('renders 4 category tabs and shows empty state for the shard category (ticket 03)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 建筑分类已随温室扩展坞迁移至后勤基建，工坊仅剩 4 类
    ['道具', '资源', '碎片', '装备'].forEach(label => {
      expect(screen.getByText(label)).toBeDefined();
    });
    expect(screen.queryByText('建筑')).toBeNull();

    // 碎片分类在工坊无产出配方 → 空态
    fireEvent.click(screen.getByText('碎片'));
    expect(screen.getByText(/碎片分类暂无配方/)).toBeDefined();
  });

  it('shows recipes with insufficient materials but disables crafting (ticket 03)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 默认存档无荧光草纤维/以太果肉 → 防化口粮包材料不足，但配方仍可见（按钮禁用）
    const card = screen.getByText('合成 压缩口粮 ×1').closest('div');
    const craftBtn = within(card as HTMLElement).getByText('合成');
    expect((craftBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
