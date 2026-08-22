/**
 * 共享战斗测试工厂（combat-assembly 04 / E#7）。
 * 统一各测试文件重复的 fake runtime / 单位桩：
 * - makeBattleUnit：零元属性配方单位（statParams 镜像最终 stats，满足 resolveStats 收紧后的要求）；
 * - makeFakeRuntime：Map 型单位表 + 事件捕获 + 功能性 dealDamage/applyHeal（hp 真实扣减/回复并派发事件）。
 */

import type { BattleEvent, BattleUnitRuntime, TurnEventKey, TurnRuntime } from '../turnEngine';

export const makeBattleUnit = (
  id: string,
  hp = 100,
  overrides: Partial<BattleUnitRuntime> = {}
): BattleUnitRuntime => {
  const stats: BattleUnitRuntime['stats'] = {
    attack: 20,
    defense: 0,
    maxHp: hp,
    maxMp: 0,
    critRate: 0,
    critDmg: 1.5,
    critResist: 0,
    damageReduction: 0,
    durationReduction: 0,
    effectReduction: 0,
    cooldownReduction: 0,
    strength: 0,
    constitution: 0,
    agility: 0,
    intelligence: 0,
    willpower: 0,
    transcendence: 0,
    arcaneBoost: 0,
    arcaneResistance: 0,
    mechanicalEvolution: 0,
    voidSpirit: 0
  };
  const unit: BattleUnitRuntime = {
    id,
    name: id,
    side: 'hero',
    hp,
    maxHp: hp,
    initiative: 100,
    abilities: [],
    stats,
    entryOrder: 0,
    ...overrides
  };
  // statParams 在 overrides 合并后镜像最终 stats，保证 resolveStats 可用且与静态面板一致。
  unit.statParams = { baseAttributes: { ...unit.stats }, permanentModifiers: [] };
  return unit;
};

export interface FakeRuntimeHandle {
  runtime: TurnRuntime;
  events: BattleEvent[];
}

export const makeFakeRuntime = (units: BattleUnitRuntime[] = []): FakeRuntimeHandle => {
  const map = new Map<string, BattleUnitRuntime>(units.map(u => [u.id, u]));
  const events: BattleEvent[] = [];
  let seq = 0;
  const emit = (key: TurnEventKey, opts: { unitId?: string | null; sourceId?: string | null; targetId?: string | null; data?: Record<string, unknown> } = {}): BattleEvent => {
    const event: BattleEvent = {
      seq: seq++,
      round: 0,
      key,
      unitId: opts.unitId ?? null,
      sourceId: opts.sourceId ?? null,
      targetId: opts.targetId ?? null,
      unitName: null,
      sourceName: null,
      targetName: null,
      data: opts.data ?? {}
    };
    events.push(event);
    return event;
  };
  const runtime: TurnRuntime = {
    round: 0,
    rng: () => 0.5,
    register: () => () => {},
    unregister: () => {},
    dispatchEvent: emit,
    dealDamage: (targetId, amount, sourceId = null, data = {}) => {
      const target = map.get(targetId);
      if (!target || target.hp <= 0) return 0;
      const actual = Math.min(target.hp, Math.max(0, amount));
      target.hp -= actual;
      emit('damageTaken', { unitId: targetId, sourceId, targetId, data: { ...data, amount: actual } });
      if (target.hp <= 0) emit('death', { unitId: targetId, sourceId, targetId, data });
      return actual;
    },
    applyHeal: (targetId, amount, sourceId = null, data = {}) => {
      const target = map.get(targetId);
      if (!target || target.hp <= 0) return 0;
      const actual = Math.min(target.maxHp - target.hp, Math.max(0, amount));
      if (actual <= 0) return 0;
      target.hp += actual;
      emit('healingTaken', { unitId: targetId, sourceId, targetId, data: { ...data, amount: actual } });
      return actual;
    },
    applyHpDelta: () => 0,
    generateUnitId: base => {
      if (!map.has(base)) return base;
      let n = 1;
      while (map.has(`${base}-${n}`)) n++;
      return `${base}-${n}`;
    },
    updateInitiative: () => {},
    summonUnit: (snapshot, sourceId = null) => {
      const unit = snapshot as BattleUnitRuntime;
      map.set(unit.id, unit);
      emit('summon', {
        unitId: unit.id,
        sourceId: sourceId ?? unit.id,
        targetId: null,
        data: { initiative: snapshot.initiative }
      });
      return unit;
    },
    requestEnd: () => {},
    getUnit: id => map.get(id),
    getLivingUnits: () => [...map.values()].filter(u => u.hp > 0)
  };
  return { runtime, events };
};
