/**
 * shelter 后勤域装配（config-json-migration 批次② 2.3）：
 * facilities/shelterUpgrades 的 icon 组件引用已由转换器替换为 iconKey，
 * 此处经 mappings/iconMap 注入回组件字段（渲染点零改动，03 号票 K1）。
 */
import facilitiesJson from '../../data/shelter/facilities.json';
import shelterUpgradesJson from '../../data/shelter/shelterUpgrades.json';
import type { UpgradePath } from '../../types/config';
import { resolveArtOrDefault } from '../mappings/artMap';
import { devGuardTable } from './devGuard';
import type { FacilityConfig, FacilityType } from '../types/gameplay.types';

type RawRow = Record<string, unknown>;

const injectIcons = <T extends object>(domain: string, raw: Record<string, T>): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const [key, row] of Object.entries(raw)) {
    const rowAny = row as RawRow;
    const rawIcon = typeof rowAny.icon === 'string' ? rowAny.icon : undefined;
    if (rawIcon) {
      out[key] = { ...(rowAny as object), icon: resolveArtOrDefault(rawIcon) } as T;
    } else {
      out[key] = row;
    }
  }
  return devGuardTable(domain, out);
};

export const FACILITIES_CONFIG = injectIcons(
  'shelter/facilities',
  facilitiesJson as unknown as Record<FacilityType, FacilityConfig>
) as Record<FacilityType, FacilityConfig>;

export const SHELTER_UPGRADES = devGuardTable(
  'shelter/shelterUpgrades',
  shelterUpgradesJson as unknown as Record<string, UpgradePath>
);

/** 设施类型守卫：字符串 → FacilityType 判定（装配域内断言，供 UI 与后勤流程共用）。 */
export const isFacilityType = (t: string): t is FacilityType => t in FACILITIES_CONFIG;
