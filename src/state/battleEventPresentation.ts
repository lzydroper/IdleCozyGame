/**
 * 战斗事件展示注册表（combat-turn）：
 * 事件流是数据源，展示文案由各事件键的 presenter 提供。
 * - 标准键（五大主时机 + 五个细粒度事件）在此注册内置 presenter；
 * - 后续 Ability/Effect 新增事件键时，用 registerBattleEventPresenter 注册自己的展示回调，
 *   UI 消费端（CombatEventLog 等）只调用 formatBattleEvent，不需要再改 switch/label 表。
 */
import type { BattleEvent, TurnEventKey } from './turnEngine';
import { ABILITY_CONFIGS } from '../data/abilities';

export interface BattleEventPresenter {
  key: TurnEventKey;
  /** 把一条事件渲染成一行展示文本。 */
  format: (event: BattleEvent) => string;
}

const presenters = new Map<TurnEventKey, BattleEventPresenter>();

export const registerBattleEventPresenter = (presenter: BattleEventPresenter): void => {
  presenters.set(presenter.key, presenter);
};

export const unregisterBattleEventPresenter = (key: TurnEventKey): void => {
  presenters.delete(key);
};

export const getBattleEventPresenter = (key: TurnEventKey): BattleEventPresenter | undefined =>
  presenters.get(key);

const nameOf = (event: BattleEvent, field: 'unit' | 'source' | 'target'): string => {
  if (field === 'unit') return event.unitName ?? event.unitId ?? '全局';
  if (field === 'source') return event.sourceName ?? event.sourceId ?? '';
  if (field === 'target') return event.targetName ?? event.targetId ?? '';
  return '';
};

/** 未注册 presenter 的事件键的兜底渲染：输出结构化字段，保证新事件不白屏。 */
const fallbackFormat = (event: BattleEvent): string => {
  const parts = [
    event.key,
    event.unitId ? `unit=${nameOf(event, 'unit')}` : '',
    event.sourceId ? `source=${nameOf(event, 'source')}` : '',
    event.targetId ? `target=${nameOf(event, 'target')}` : ''
  ].filter(Boolean);
  const dataText = Object.keys(event.data).length > 0 ? JSON.stringify(event.data) : '';
  return `${parts.join(' ')}${dataText ? ` ${dataText}` : ''}`;
};

export const formatBattleEvent = (event: BattleEvent): string => {
  const presenter = presenters.get(event.key);
  return presenter ? presenter.format(event) : fallbackFormat(event);
};

export const isDisplayableEvent = (event: BattleEvent): boolean => Boolean(formatBattleEvent(event));

// === 内置 presenter：标准键（引擎契约的一部分） ===

registerBattleEventPresenter({
  key: 'roundStart',
  format: event => `第 ${event.round} 轮开始`
});

registerBattleEventPresenter({
  key: 'roundEnd',
  format: event => `第 ${event.round} 轮结束`
});

registerBattleEventPresenter({
  key: 'turnStart',
  format: event => `【${nameOf(event, 'unit')}】回合开始`
});

registerBattleEventPresenter({
  key: 'turnActive',
  format: event => `【${nameOf(event, 'unit')}】行动中`
});

registerBattleEventPresenter({
  key: 'turnEnd',
  format: event => `【${nameOf(event, 'unit')}】回合结束`
});

registerBattleEventPresenter({
  key: 'abilityUsed',
  format: event => {
    const data = event.data as {
      abilityId?: string;
      targetIds?: string[];
      costPaid?: { resource: string; amount: number } | null;
      cooldownSet?: number;
    };
    const abilityName =
      (data.abilityId ? ABILITY_CONFIGS[data.abilityId]?.name : undefined) ??
      data.abilityId ??
      '未知技能';
    const targetIds = data.targetIds ?? [];
    const target = targetIds.length > 1
      ? `[${targetIds.join(', ')}]`
      : (nameOf(event, 'target') || '无目标');
    const cost = data.costPaid ? `消耗 ${data.costPaid.amount} ${data.costPaid.resource}` : '';
    const cd = data.cooldownSet ? `冷却 ${data.cooldownSet}` : '';
    return `【${nameOf(event, 'source')}】→【${target}】使用【${abilityName}】${cost ? ' ' + cost : ''}${cd ? ' ' + cd : ''}`;
  }
});

registerBattleEventPresenter({
  key: 'attackAfter',
  format: () => ''
});

registerBattleEventPresenter({
  key: 'damageTaken',
  format: event => `【${nameOf(event, 'target')}】受到 ${String(event.data.amount ?? 0)} 点伤害`
});

registerBattleEventPresenter({
  key: 'healingTaken',
  format: event => `【${nameOf(event, 'target')}】恢复 ${String(event.data.amount ?? 0)} 点生命`
});

registerBattleEventPresenter({
  key: 'death',
  format: event => `【${nameOf(event, 'unit')}】阵亡`
});

registerBattleEventPresenter({
  key: 'summon',
  format: event => `【${nameOf(event, 'unit')}】被召唤入场`
});

registerBattleEventPresenter({
  key: 'effectApplied',
  format: event => {
    const data = event.data as {
      kind?: string;
      values?: Record<string, number>;
    };
    const source = nameOf(event, 'source') || nameOf(event, 'unit');
    const target = nameOf(event, 'target');
    const values = data.values ?? {};
    switch (data.kind) {
      case 'damage':
      case 'heal':
        return '';
      case 'statModify':
        return `【${target}】属性修正 ${String(values.value ?? 0)}`;
      case 'stun':
        return `【${target}】受到眩晕效果`;
      case 'dispel':
        return `【${target}】增益效果被驱散`;
      case 'immunityElement':
        return `【${target}】获得元素免疫`;
      case 'immunityBuff':
        return `【${target}】获得状态免疫`;
      case 'taunt':
        return `【${target}】被嘲讽`;
      case 'summon':
        return `【${source}】召唤 ${String(values.count ?? 0)} 个单位`;
      case 'applyBuff':
        return `【${target}】获得状态效果`;
      default:
        return '';
    }
  }
});