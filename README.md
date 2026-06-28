# AetherGarden (以太温室) - 废土魔导挂机收菜游戏

AetherGarden 是一款融合了**废土科幻、魔导种植、集体无意识梦境与现实同伴救援**的移动端轻度挂机收菜（Cozy-Idle）独立游戏。

玩家将扮演一名废土避难所的守护者，在地下温室培育发光魔导植物提供生存物资，利用脑波同步仪潜入集体梦境锁定失联幸存者的坐标，并亲自踏上风沙肆虐的现实地表开展营救行动，重建人类的避难所家园。

---

## 🌟 核心系统设计

### 1. 魔导温室种植系统 (Greenhouse)
- **挂机收菜**：解锁多格培养槽。种植不同的魔导植物（如辐射荧光草、以太浆果、钢纹向日葵），消耗水分维持生长，在离线期间也会持续累计生长进度。
- **一键操作**：提供一键收割、一键浇水、连播荧光草等挂机收割的便捷功能。
- **收获视觉反馈**：收获时，每个卡牌独立爆发出精美的特效气泡（以绝对定位在卡牌中心飘浮升起），多重收益自动堆叠避免重合，收菜爽感拉满。

### 2. 遭遇卡牌左右滑动探索 (Exploration & SwipeCard)
- **卡牌式交互**：探索过程采用沉浸式遭遇卡牌，支持鼠标拖拽以及手机屏幕横向滑动：
  - **← 向左滑动**：选择选项 A 决策。
  - **向右滑动 →**：选择选项 B 决策。
- **临时背囊**：探索地表获得的物资会暂存至防护服的临时背囊，中途重伤昏迷将丢失全部物资，只有点击“安全撤退”返回避难所，物资才会合并入主储藏箱。
- **探险沉浸锁定**：在外出探险（废土地表或梦境深处）时，底部导航栏将被锁定以保证探索的专注度和沉浸感。当避难所内的温室作物全部成熟时，会弹窗提醒玩家“可以撤退收割”。

### 3. 集体心灵梦境与同伴共鸣 (Dreamscape & Survivors)
- **理智值 (Sanity) 与污染度 (Pollution)**：入梦消耗理智。每次梦境抉择会降低理智或增加心灵污染度。污染度达到 100% 将触发“梦魇侵入避难所”危机，冻结温室作物生长。
- **心灵共鸣**：在梦境世界的事件中，有几率捕获其他幸存同伴（工程师罗伊、农学家阿梅、信使 Zero）发出的心灵波束。连结并使其共鸣度达到 100% 即可在现实中锁定其肉体坐标。
- **梦胶囊**：梦境专属药剂，使用工坊产出的梦胶囊可以补充理智或驱散污染（跃迁折跃）。

### 4. 废土地标救援与同伴加成 (Rescue Missions)
- 锁定坐标后，玩家可以在地表探索页开启特殊的**同伴营救任务**（前往雷达站、温室废墟、高频信号塔）。
- 救援任务共计 5 步，前 4 步为常规探索，第 5 步必定遭遇高难度的同伴营救卡牌事件，需要玩家利用已制造好的电磁防御塔或压缩口粮来智斗或强攻变异巨兽。
- 营救成功后，同伴会跟随你返回避难所，并解锁永久的避难所效率加成（如降低合成能耗、提高作物生长速度、降低探索消耗）。

### 5. 生存者冷冻舱账户系统 (Survivor Terminal)
- **多账户隔离**：点击顶部终端可切换、删除、或新建生存者账户。
- **存档机制**：每个生存者拥有完全独立的生命值、饱食度、理智值、仓库物资、解锁图鉴与天数进度，互不干扰，重新进入自动读取最新活跃存档。

### 6. 魔导工坊与梦魇防御 (Workshop)
- **合成图纸**：消耗发光植物与废金属制造压缩口粮（恢复饱食度）、魔能罐（恢复魔能）与电磁防御塔等生存必需品。
- **梦魇防御控制台**：梦魇兽侵入避难所时，玩家必须在工坊控制台使用防御塔（HP -35）或超频避难所核心（消耗魔能，HP -15）消灭怪物，成功消灭可提炼珍贵的“虚空结晶”。

---

## 📂 项目文件目录结构

```bash
IdleCozyGame/
├── public/                 # 静态资源与页面图标
├── src/
│   ├── assets/             # AI 绘制的避难所背景图与作物卡面图片
│   ├── components/
│   │   ├── GreenhouseTab.tsx    # 温室种植管理
│   │   ├── WildernessTab.tsx    # 现实探索与目的地选择救援
│   │   ├── DreamscapeTab.tsx    # 梦境潜入与脑波调试
│   │   ├── WorkshopTab.tsx      # 合成、道具使用与防守控制台
│   │   ├── LogTab.tsx           # 背囊清单、过滤式避难所日志、幸存同伴图鉴 [NEW]
│   │   ├── SwipeCard.tsx        # 左右手势滑动卡牌交互组件 [NEW]
│   │   └── ToastSystem.tsx      # 自定义非阻塞Toast与Confirm确认弹窗 [NEW]
│   ├── context/
│   │   └── GameContext.tsx      # 游戏全局状态机、同步加载逻辑与事件处理器
│   ├── data/                    # 策划配置文件目录 (数据驱动化) [NEW]
│   │   ├── items.ts             # 全局道具定义元数据
│   │   ├── recipes.ts           # 合成配方与充能定义
│   │   ├── survivors.ts         # 同伴故事、救援点与加成属性
│   │   ├── realityEvents.ts     # 地表荒野遭遇事件池
│   │   └── dreamEvents.ts       # 梦境突发遭遇事件池
│   ├── types/
│   │   └── game.ts              # 游戏全局状态 TypeScript 类型声明
│   ├── App.tsx                  # 游戏主视图容器、顶部属性条、终端账户抽屉与导航控制
│   ├── main.tsx                 # App 挂载与 ToastProvider 包裹
│   └── index.css                # Tailwind 引入与全局主题定义
├── tsconfig.json           # TS 配置
├── vite.config.ts          # Vite 配置
└── package.json            # 依赖包及脚本
```

---

## 🛠️ 数据驱动扩展指南 (如何新增内容)

本项目采用全数据驱动设计。无需修改组件代码，仅需调整 `src/data/` 目录下的配置文件即可快速增减游戏内容：

### 1. 新增道具/材料
在 `src/data/items.ts` 的 `ITEMS_CONFIG` 对象中追加道具元属性：
```typescript
export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  // 你的新物品
  my_new_item: {
    id: 'my_new_item',
    name: '新型超导体',
    emoji: '💎',
    description: '废土深处发现的高密度能量传导晶体。',
    category: 'material' // 分类：'seed'|'material'|'food'|'equipment'|'special'
  }
};
```

### 2. 新增合成配方
在 `src/data/recipes.ts` 的 `RECIPES_CONFIG` 中追加图纸：
```typescript
export const RECIPES_CONFIG: Record<string, Recipe> = {
  super_core: {
    id: 'super_core',
    name: '超载魔导核心',
    description: '利用新型超导体与发光草合成的便携高容量核心。',
    cost: { my_new_item: 1, glow_fiber: 5 }, // 消耗材料及数量
    reward: { energy_refill: 3 }             // 产出物品及数量（特殊充能配方请参考 recipes.ts 内 sanity_capsule 的配置写法）
  }
};
```

### 3. 新增同伴及救援地点
1. 在 `src/data/survivors.ts` 的 `SURVIVORS_CONFIG` 中添加幸存同伴设定：
   ```typescript
   {
     id: 'lucy',
     name: '露西',
     role: 'scout',
     emoji: '🏹',
     backstory: '身手敏捷的荒野猎手，拥有惊人的直觉。',
     dreamTrigger: '梦境风暴的边缘，一支燃烧着的箭矢为你指明了方向...',
     realityLocationId: 'collapsed_tunnel', // 现实中对应的锁定营救点
     bonus: 0.15,
     bonusDescription: '现实探索移动速度 +15%'
   }
   ```
2. 在 `src/data/dreamEvents.ts` 中，为某个梦境抉择的 results 绑定 `targetSurvivorId: "lucy"` 并给予 `resonance: 50`。当玩家在梦中选择此选项累积露西的共鸣度达到 100% 后，便会自动解锁现实中露西的救援路线！
3. 在 `src/components/WildernessTab.tsx` 中编写露西在 `collapsed_tunnel` 的第 5 步特殊救援事件分支，并在判定中调用救援成功的状态同步。

---

## 💻 开发者运行与部署调试

### 1. 运行本地开发服务
```bash
# 安装依赖
npm install

# 启动热重载开发服务器
npm run dev
```

### 2. 运行单元测试 (TDD)
本项目包含完善的自动化测试文件，涵盖账户隔离、离线增幅计算、温室行为、探索状态等核心业务层：
```bash
npx vitest run
```

### 3. 打包生产环境 bundle
```bash
npm run build
```

### 4. 手机端 ngrok 调试 Blocked Host 解决方案
在尝试用手机测试滑动操作时，可能会使用类似 `ngrok http 5173` 的反向代理服务，但在浏览器中会提示 `Blocked request. This host is not allowed.`。

这是由于 Vite 默认的安全主机审查机制限制了未知 host 的请求。请在 `vite.config.ts` 中加入 `allowedHosts` 信任 ngrok 域名。例如：
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'negative-speed-acid.ngrok-free.dev', // 将你手机的 ngrok 隧道地址填入此处
      '.ngrok-free.dev'                     // 或使用通配符信任所有 ngrok-free 域名
    ]
  }
});
```

---

## 🎨 视觉与风格说明
- **主题配色**：极低对比度暗色废土背景（微量魔导晶格感），搭配霓虹色彩指示层（温室：魔导翠绿，探索：电波浅蓝，梦境：星云魅紫，工坊：核心熔岩橙）。
- **组件动画**：
  - 滑动卡牌的飞出与弹回采用弹性贝塞尔过渡 (`transition-all duration-205 ease-out`)。
  - 作物收割飘字在向上飘动的同时，辅以淡出与渐小动画。
  - 梦魇侵入时，红色污染仪表盘辅以呼吸报警闪烁特效。
