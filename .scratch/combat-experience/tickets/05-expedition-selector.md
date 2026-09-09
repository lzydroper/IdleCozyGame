# 05 远征选择器接入

Type: task
Status: resolved

## 内容

U#7：ExpeditionPanel 的独立卡片列表替换为 RegionSelectorModal(mode="expedition") 复用。

## Answer（实施记录）

- 地点行改为「当前地点摘要 + 选择地点」触发统一选择器；onConfirmSelect 将 regionId 映射回 `region.expedition.id`（无远征地点的区域 toast 拦截）。
- 门槛不匹配警告与口粮/派遣逻辑保持原位；expeditionOptions 死代码删除。
- 已知边界：选择器暂列全部可见区域（含无远征地点者），由确认时拦截——过滤收窄归后续内容开放更多远征地点时一并处理。

## 验收

远征入口走统一选择器；既有远征流程回归通过。
