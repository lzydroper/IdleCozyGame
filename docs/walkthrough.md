# 探险事件大更新 (v1.1.0) 验收报告

我们在本次更新中成功重构了《AetherGarden》的探险事件系统，增加了数值平衡性、概率调控与事件多样性，并完成了版本升级。

## 修改内容清单

1. **多级分类与双重加权抽卡机制**：
   - 扩展了 `RealityEvent` 和 `DreamEvent` 接口，显式引入了 `type` 字段（现实：`welfare`/`common`/`danger`/`combat`；梦境：`welfare`/`common`/`danger`/`signal`）以及可选的 `weight`（单个事件权重）。
   - 在 [WildernessTab.tsx](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/src/components/WildernessTab.tsx) 与 [DreamscapeTab.tsx](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/src/components/DreamscapeTab.tsx) 中实现 **双重加权筛选算法**：
     - **第一阶段**：按照“事件分类”大权重筛选。分类权重配置为：`common: 100`、`danger: 80`、`combat/signal: 60`、`welfare: 40`。确保**福利事件（welfare）的出现大概率不超过惩罚（danger）、战斗（combat）等事件**。
     - **第二阶段**：在选定类别下，按照事件本身的个体 `weight` 再次筛选出具体的事件。

2. **现实探险事件大更新**：
   - 更新了 [realityEvents.ts](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/src/data/realityEvents.ts)，为全部 20 个事件定义了明确的 `type` 类别。
   - 平衡了基础数值，调低了过于苛刻的属性惩罚。
   - 新增了纯恢复福利事件（如 `cozy_hotspring` 温泉）、高收益探索事件（如 `scrap_graveyard` 废铁终结地）以及风险/回报并存的抉择事件。

3. **梦境探险事件大更新**：
   - 更新了 [dreamEvents.ts](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/src/data/dreamEvents.ts)，为全部 21 个事件（含 6 个幸存者共鸣信号）配置了 `type`。
   - 适当下调了污染增加幅度和理智的惩罚性损耗，增加玩家在梦境中的容错空间。
   - 新增了大幅恢复理智与净化污染的福利事件（如 `cloud_pillow` 梦境云朵枕头），以及其他奇幻梦境遭遇。

4. **版本升级**：
   - 将 [package.json](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/package.json) 中的版本号升级至 `"1.1.0"`。
   - 将 [App.tsx](file:///e:/%E7%B3%BB%E7%BB%9F/%E6%96%87%E6%A1%A3/GitHub/IdleCozyGame/src/App.tsx) 顶部的版本显示更改为 `Beta v1.1.0`。
   - 顺便修复了原本存在于 `CloudSyncWidget.tsx` 的几处 TypeScript 类型定义错误和未读取变量问题，使项目能够完美编译。

## 验证与测试结果

- **编译测试**：执行 `npm run build`，项目编译成功，未发生任何 TypeScript 错误或代码打包错误。
- **运行测试**：双重加权抽取逻辑运行稳定，大分类权重及子项事件权重叠加筛选正常，福利事件概率完美受控低于危险/战斗事件。
