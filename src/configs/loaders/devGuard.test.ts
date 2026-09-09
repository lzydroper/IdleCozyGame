// devGuard 守卫单测：键控表形态（key/id 对账）与行数组形态（行内 id 即身份、查重）。
import { describe, it, expect } from 'vitest';
import { devGuardRows, devGuardTable, devGuardKeyed } from './devGuard';

describe('devGuardTable（键控表）', () => {
  it('key 与行内 id 不一致抛错', () => {
    expect(() => devGuardTable('t', { a: { id: 'b' } })).toThrow(/key 'a' 与内容 id 'b' 不一致/);
  });

  it('行内 id 可省（身份=key）', () => {
    expect(() => devGuardTable('t', { a: {} })).not.toThrow();
  });
});

describe('devGuardRows（行数组）', () => {
  it('重复 id 抛错（数组无 key 对账，靠查重兜底）', () => {
    expect(() => devGuardRows('t', [{ id: 'a' }, { id: 'a' }])).toThrow(/重复 id 'a'/);
  });

  it('缺 id 或非字符串 id 抛错', () => {
    expect(() => devGuardRows('t', [{ name: 'x' }])).toThrow(/缺少非空字符串 id/);
    expect(() => devGuardRows('t', [{ id: 3 }])).toThrow(/缺少非空字符串 id/);
  });

  it('必填字段缺失按 id 报错；合法行原样返回', () => {
    expect(() => devGuardRows('t', [{ id: 'a' }], { required: ['name'] })).toThrow(
      /'a' 缺少必填字段 'name'/
    );
    const rows = [{ id: 'a', name: 'A' }];
    expect(devGuardRows('t', rows, { required: ['name'] })).toBe(rows);
  });
});

describe('devGuardKeyed（双形态归一）', () => {
  it('map 形态 → [key, row] 条目，行内 id 可省', () => {
    expect(devGuardKeyed('t', { a: { id: 'a' }, b: {} })).toEqual([
      ['a', { id: 'a' }],
      ['b', {}]
    ]);
  });

  it('数组形态 → [row.id, row] 条目，顺序保持；重复 id 抛错', () => {
    expect(devGuardKeyed('t', [{ id: 'x', v: 1 }, { id: 'y', v: 2 }])).toEqual([
      ['x', { id: 'x', v: 1 }],
      ['y', { id: 'y', v: 2 }]
    ]);
    expect(() => devGuardKeyed('t', [{ id: 'x' }, { id: 'x' }])).toThrow(/重复 id/);
  });

  it('必填字段检查两形态同源生效', () => {
    expect(() => devGuardKeyed('t', [{ id: 'a' }], { required: ['name'] })).toThrow(
      /缺少必填字段 'name'/
    );
    expect(() => devGuardKeyed('t', { a: {} }, { required: ['name'] })).toThrow(
      /'a' 缺少必填字段 'name'/
    );
  });
});
