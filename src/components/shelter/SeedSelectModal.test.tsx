// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeedSelectModal } from './SeedSelectModal';

describe('SeedSelectModal（09 种子选择弹窗统一）', () => {
  const baseProps = {
    isOpen: true,
    title: '选择种植作物',
    inventory: { seed_glow_grass: 3, seed_aether_berry: 1 } as Record<string, number>,
    onSelect: vi.fn(),
    onClose: vi.fn()
  };

  it('渲染拥有种子的作物条目（作物名 + 种子数 + 生长时间 + 产出预览）', () => {
    render(<SeedSelectModal {...baseProps} />);
    expect(screen.getByText('辐射荧光草')).toBeDefined();
    expect(screen.getByText('以太浆果')).toBeDefined();
    expect(screen.getAllByText('种子').length).toBe(2);
    // 产出预览：辐射荧光草 → 荧光草纤维 ×2（唯一 ×2）
    expect(screen.getByText('×2')).toBeDefined();
    expect(screen.getAllByText('×1').length).toBeGreaterThan(0);
  });

  it('隐藏无种子作物；全部无种子时显示空态', () => {
    const { rerender } = render(<SeedSelectModal {...baseProps} />);
    // seed_steel_sunflower 不在 inventory → 钢纹向日葵不显示
    expect(screen.queryByText('钢纹向日葵')).toBeNull();
    rerender(<SeedSelectModal {...baseProps} inventory={{}} />);
    expect(screen.getByText('暂无可用种子')).toBeDefined();
  });

  it('点击条目回调 onSelect(cropId)', () => {
    const onSelect = vi.fn();
    render(<SeedSelectModal {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('辐射荧光草'));
    expect(onSelect).toHaveBeenCalledWith('glow_grass');
  });

  it('selectedCropId 命中的条目高亮（选种模式）', () => {
    render(<SeedSelectModal {...baseProps} selectedCropId="aether_berry" />);
    const entry = screen.getByText('以太浆果').closest('[class*="rounded-xl"]');
    expect(entry?.className).toContain('purple-500');
  });

  it('isOpen=false 不渲染', () => {
    render(<SeedSelectModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('辐射荧光草')).toBeNull();
  });

  it('点击遮罩关闭', () => {
    const onClose = vi.fn();
    render(<SeedSelectModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('seed-modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
