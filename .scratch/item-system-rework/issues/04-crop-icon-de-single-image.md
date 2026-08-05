# 04 — 作物图标去单图化

**What to build:** 作物不再引用单独图片文件（遗留问题清除）：删除作物配置中的 image 字段与 7 张单图文件，温室/种植界面作物以 Lucide 占位渲染，后续补图走统一 sprite 配置。

**Blocked by:** None — can start immediately（与 01-03 无数据依赖，可并行）

**Status:** ready-for-agent

- [ ] 作物配置不再含 image 字段；7 张单图文件（crop_*.jpg）已从资源目录删除
- [ ] 温室界面作物渲染为 Lucide 占位，无破图、无对已删图片的请求
- [ ] 对应组件测试更新，`npx vitest run`、`npm run build`、`npm run lint` 全绿
