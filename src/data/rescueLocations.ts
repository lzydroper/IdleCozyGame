/**
 * 救援坐标显示名（combat-level 07 收尾）。
 * 远征配置迁移后仅剩 radar_station，但救援事件仍引用多个坐标；此处保留显示名映射。
 */
export const RESCUE_LOCATION_NAMES: Record<string, { displayName: string; shortName?: string }> = {
  radar_station: { displayName: '废弃雷达站', shortName: '雷达站' },
  subway_station: { displayName: '坍塌地铁站', shortName: '地铁站' },
  collapsed_subway: { displayName: '坍塌地铁站', shortName: '地铁站' },
  bio_lab: { displayName: '生化实验室', shortName: '实验室' },
  poison_factory: { displayName: '废弃制药厂', shortName: '制药厂' },
  ruined_armory: { displayName: '坍塌军械库', shortName: '军械库' },
  ancient_library: { displayName: '旧世大图书馆', shortName: '图书馆' },
  green_ruins: { displayName: '绿色遗迹', shortName: '遗迹' },
  signal_tower: { displayName: '信号塔', shortName: '信号塔' },
  military_depot: { displayName: '军火库', shortName: '军火库' }
};
