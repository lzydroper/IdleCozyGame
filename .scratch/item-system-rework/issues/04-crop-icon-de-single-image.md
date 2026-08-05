# 04 — 作物图标去单图化

**What to build:** 作物不再引用单独图片文件（遗留问题清除）：删除作物配置中的 image 字段与 7 张单图文件，温室/种植界面作物以 Lucide 占位渲染，后续补图走统一 sprite 配置。

**Blocked by:** None — can start immediately（与 01-03 无数据依赖，可并行）

**Status:** resolved

- [x] 作物配置不再含 image 字段；7 张单图文件（crop_*.jpg）已从资源目录删除
- [x] 温室界面作物渲染为 Lucide 占位，无破图、无对已删图片的请求
- [x] 对应组件测试更新，`npx vitest run`、`npm run build`、`npm run lint` 全绿

## Answer

已在分支 `hero-ehco` 完成（commit `c974bb1`），全量 330 测试通过（+1）、tsc/vite build 绿、oxlint 与基线一致（零新增）。

**实施要点（TDD：先补测试红 → 清理绿）**：
- `CropConfig` 删除 `image?: string` 字段；`crops.ts` 移除 7 个 `crop_*.jpg` import 与 7 处 `image` 配置；
- `ShelterTab` 温室作物渲染删除 `<img>` 分支，统一 Lucide `Sprout` 占位（原有占位视觉），补图走统一 sprite 配置（ADR-0015 路线）；
- 删除 `src/assets/` 下 7 张 `crop_*.jpg` 遗留单图（约 6MB），全项目 grep 零残留引用；
- `ShelterTab.test.tsx` 新增用例：预置已种植存档 → 作物名可见 + `queryAllByRole('img')` 为 0（无单图请求）；补 `beforeEach` 清 localStorage；
- review 通过（ship as-is），无阻塞问题。
