// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroSkillModal from './HeroSkillModal';
import HeroDetailModal from './HeroDetailModal';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { INITIAL_STATE } from '../configs/seed/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

const seedSave = (mutate?: (save: typeof INITIAL_STATE) => void) => {
  const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
  mutate?.(save);
  localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
};

// 弹窗经 createPortal 渲染到 document.body，断言统一走 body
const bodyText = (): string => document.body.textContent ?? '';

const renderModal = (skillIndex: number) =>
  render(
    <ToastProvider>
      <GameProvider>
        <HeroSkillModal isOpen heroId="nova" skillIndex={skillIndex} onClose={vi.fn()} />
      </GameProvider>
    </ToastProvider>
  );

describe('HeroSkillModal（heroes-skills spec §4）', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('解锁槽位：占位符渲染实际值 + 结构字段行', () => {
    seedSave(save => { save.heroes.nova.level = 1; });
    renderModal(1);
    // slot1 growth perStar 0.05 × 星1 → 0.9×1.05 = 94.5% → 渲染 95%
    expect(bodyText()).toContain('95% 攻击伤害');
    expect(bodyText()).toContain('冷却 2');
    expect(bodyText()).toContain('优先级 2');
  });

  it('锁定槽位：显示解锁条件与当前进度，不显示里程碑预告', () => {
    seedSave(save => { save.heroes.nova.level = 3; });
    renderModal(2);
    expect(bodyText()).toContain('锁定中');
    expect(bodyText()).toContain('等级 ≥10');
    expect(bodyText()).toContain('当前：等级 3 · 星级 1');
    expect(bodyText()).not.toContain('成长预告');
  });

  it('里程碑预告：12 级槽2 预告「等级 20：冷却 → 3」', () => {
    seedSave(save => { save.heroes.nova.level = 12; });
    renderModal(2);
    expect(bodyText()).toContain('成长预告');
    expect(bodyText()).toContain('等级 20');
    expect(bodyText()).toContain('冷却 → 3');
  });

  it('天赋重写标注：投入「电弧重构」后槽2 展示改写信息与优先级 6', () => {
    seedSave(save => {
      save.heroes.nova.level = 12;
      save.heroes.nova.awakened = true;
      save.heroes.nova.talents = { hero_nova_rewire: 1 };
    });
    renderModal(2);
    expect(bodyText()).toContain('电弧重构');
    expect(bodyText()).toContain('已重写');
    expect(bodyText()).toContain('优先级 6');
  });

  it('觉醒槽位：未觉醒锁定、觉醒后展示觉醒技', () => {
    seedSave();
    const locked = renderModal(3);
    expect(locked.container.textContent === '' ? bodyText() : locked.container.textContent).toContain('完成觉醒');
    locked.unmount();

    seedSave(save => { save.heroes.nova.awakened = true; });
    const unlocked = renderModal(3);
    expect(unlocked.container.textContent === '' ? bodyText() : unlocked.container.textContent).toContain('电涌过载');
  });
});

describe('英雄详情弹窗 ↔ 技能弹窗联动', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('点击技能槽打开预览弹窗', () => {
    seedSave();
    render(
      <ToastProvider>
        <GameProvider>
          <HeroDetailModal isOpen heroId="nova" onClose={vi.fn()} />
        </GameProvider>
      </ToastProvider>
    );
    fireEvent.click(screen.getByTitle('查看【电弧矢】'));
    // 已解锁槽位显示技能名：槽位标签「电弧矢」+ 弹窗标题「【电弧矢】」
    expect(screen.getAllByText(/电弧矢/).length).toBeGreaterThanOrEqual(2);
    expect(bodyText()).toContain('攻击伤害');
  });

  it('锁定槽位显示槽位名而非技能名', () => {
    seedSave();
    render(
      <ToastProvider>
        <GameProvider>
          <HeroDetailModal isOpen heroId="nova" onClose={vi.fn()} />
        </GameProvider>
      </ToastProvider>
    );
    // 槽 2 未解锁（Lv.10 门槛）→ 标签为「技能 2」，不显示「过载贯穿」
    expect(screen.getByText('技能 2')).toBeDefined();
    expect(screen.queryByText('过载贯穿')).toBeNull();
  });
});
