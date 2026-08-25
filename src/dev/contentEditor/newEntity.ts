/**
 * 新建实体模板：敌人 / 能力 / Buff / 英雄 / 区域。
 * 一个实体可能对应多个文件（区域 = regionInfo + levels）；模板值均为合法最小配置。
 */
import type { JsonValue } from './types';

export type NewEntityKind = 'enemy' | 'ability' | 'buff' | 'hero' | 'region';

export interface BuiltFile {
  path: string;
  doc: JsonValue;
}

export const ENTITY_KIND_LABEL: Record<NewEntityKind, string> = {
  enemy: '敌人',
  ability: '能力',
  buff: 'Buff',
  hero: '英雄',
  region: '区域'
};

/** 实体 id 约定：小写字母/数字开头，仅含小写字母/数字/下划线，至少含一个字母（兼容区域 NN_ 前缀惯例） */
export const ENTITY_ID_RE = /^(?=[a-z0-9_]*[a-z])[a-z0-9][a-z0-9_]*$/;

export const buildEntityFiles = (kind: NewEntityKind, id: string): BuiltFile[] => {
  switch (kind) {
    case 'enemy':
      return [
        {
          path: `src/data/entities/enemies/${id}.json`,
          doc: {
            id,
            name: '新敌人',
            description: '',
            kind: 'enemy',
            role: 'normal',
            faction: 'nightmare',
            baseAttributes: { maxHp: 30, attack: 5, defense: 2 },
            abilities: []
          }
        }
      ];
    case 'ability':
      return [
        {
          path: `src/data/combat/abilities/${id}.json`,
          doc: {
            id,
            name: '新能力',
            description: '待补充描述',
            activation: 'active',
            targeting: 'enemy:first',
            cooldown: 0,
            priority: 0,
            effects: []
          }
        }
      ];
    case 'buff':
      return [
        {
          path: `src/data/combat/buffs/${id}.json`,
          doc: {
            buffId: id,
            durationKind: 'temporary',
            renew: true,
            stack: false,
            stackIncrement: 1,
            removable: true,
            triggers: [{ timing: 'turnStart', unitRef: 'target' }],
            effects: []
          }
        }
      ];
    case 'hero':
      return [
        {
          path: `src/data/entities/heroes/${id}/heroInfo.json`,
          doc: {
            id,
            name: '新英雄',
            description: '待补充档案',
            icon: `entities/heroes/${id}.png`,
            heroClass: 'attacker',
            faction: 'mechanical',
            baseAttributes: { maxHp: 100, attack: 10, defense: 5 },
            primaryAttributes: { strength: 5, constitution: 5, agility: 5, intelligence: 5, willpower: 5, transcendence: 5 },
            starter: false,
            order: 99
          }
        },
        {
          // heroes-skills v1.2：技能槽位骨架（恒三行，本体逐行内联；槽3 = 觉醒技占位，待补效果）
          path: `src/data/entities/heroes/${id}/skills.json`,
          doc: [
            {
              id: `${id}_skill_1`,
              slot: 1,
              ability: {
                id: `${id}_skill_1`,
                name: '技能一',
                description: '待补充描述',
                activation: 'active',
                targeting: 'enemy:first',
                cooldown: 0,
                priority: 0,
                effects: []
              }
            },
            {
              id: `${id}_skill_2`,
              slot: 2,
              ability: {
                id: `${id}_skill_2`,
                name: '技能二',
                description: '待补充描述',
                activation: 'active',
                targeting: 'enemy:first',
                cooldown: 0,
                priority: 0,
                effects: []
              },
              unlock: { level: 10 }
            },
            {
              id: `awaken_${id}`,
              slot: 3,
              ability: {
                id: `awaken_${id}`,
                name: '觉醒技',
                description: '待补充描述',
                activation: 'active',
                targeting: 'enemy:all',
                cooldown: 3,
                priority: 1,
                effects: []
              },
              unlock: { awakened: true }
            }
          ]
        }
      ];
    case 'region':
      return [
        {
          path: `src/data/regions/${id}/regionInfo.json`,
          doc: {
            id,
            name: '新区域',
            description: '待补充描述',
            order: 99,
            recommendedLevel: 1,
            enemyPool: [],
            explorationEvents: [],
            explorationStepsToClear: 10,
            explorationMilestones: []
          }
        },
        {
          path: `src/data/regions/${id}/levels.json`,
          doc: []
        }
      ];
  }
};

/** 创建后的操作提醒（如英雄需补 survivors 行） */
export const ENTITY_FOLLOWUP: Partial<Record<NewEntityKind, string>> = {
  hero: '记得：① survivors.json 补一行（同 id）；② 立绘放 sprites/entities/heroes/<id>.png；③ skills.json 骨架已生成，补齐三行技能本体（槽3 = 觉醒技）',
  region: '记得：把敌人加入 enemyPool，并在 levels.json 配置关卡',
  enemy: '记得：把敌人加入目标区域的 enemyPool，并在 components/iconMaps.ts 的 ENEMY_ICON_MAP 补图标'
};
