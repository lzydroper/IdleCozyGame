# 废土魔导温室 (AetherGarden) 项目架构与系统文档

为了帮助后续接入的开发助手（AI）能够瞬间理解并接手本项目，本文档详细阐述了项目的核心设计、模块划分、运行机制以及状态流转。

---

## 1. 项目简介 (Overview)
`AetherGarden` 是一款废土魔导温室题材的放置经营（Idle Cozy）游戏。
玩家扮演一名废土避难所的幸存者，通过在温室种植魔法作物、在工坊制造装备与生存补给、潜入心灵梦境锁定同伴坐标，以及在地表荒野探索营救同伴，逐步扩大避难所规模，并抵御废土威胁。

---

## 2. 核心状态中心 (`GameContext.tsx`)
游戏的所有全局状态和核心业务逻辑均封装在 `src/context/GameContext.tsx` 中（约 1392 行）。

### 核心状态结构 (`GameState`，定义于 `src/types/game.ts`)
```typescript
interface GameState {
  player: PlayerStats;       // HP, maxHP, food, maxFood, energy, maxEnergy, sanity, maxSanity, days
  inventory: Record<string, number>; // 避难所储藏箱（背包）
  greenhouse: {
    slots: GreenhouseSlot[]; // 培养槽状态（id, cropId, growthProgress, growthTimeLeft, isWatered）
    unlockedSlotsCount: number; // 当前已解锁的槽位数（上限 8 个）
  };
  survivors: Record<string, Survivor>; // 同伴状态（包含是否解锁、现实坐标、指派状态等）
  exploration: {
    inRealityExploration: boolean;
    realitySteps: number;
    realityLocationId: string | null;
    realityBag: Record<string, number>; // 探索中临时背包
    realityEventId?: string | null;
    inDreamExploration: boolean;
    dreamSteps: number;
    dreamPollution: number;            // 0-100
    dreamBag: Record<string, number>;
    dreamEventId?: string | null;
    capsulesCharge: Record<string, number>; // 梦胶囊剩余可用次数
    survivorResonance: Record<string, number>; // 幸存者ID -> 共鸣度
  };
  discoveredBlueprints: string[];
  activeAlert: { type: "dream_leak" | null; hp: number };
  lastTick: number;          // 上一次心跳时间（用于离线生长时间计算）
  dayStartTime: number;      // 每一天开始的时间戳
  logs: LogEntry[];          // 无线电系统日志
  hasCatherine?: boolean;
  hasBuster?: boolean;
  hasNova?: boolean;
  shelter: ShelterStats;     // 避难所升级与自动化设施
  lastOfflineReport?: OfflineReport | null; // 离线收益结算弹窗
}
```

### 额外关键接口
- **`ShelterStats`** — 避难所基础属性：`maxOfflineDuration`, `batteryLevel`, `generatorLevel`, `recyclerLevel`, `facilities`（自动化设施）、`assignedWatererId`（自动浇水）、`assignedExplorerId`（挂机探索）、`expedition`（挂机派遣状态）
- **`AutomationFacility`** — 自动化设施（`smelter`/`assembler`）：`level`, `activeRecipeId`, `currentProgress`, `timeLeft`, `assignedSurvivorId`
- **`AutoRecipe`** — 自动流水线配方：输入输出与耗时
- **`OfflineReport`** — 离线收益报告：`elapsedSeconds`, `recoveredEnergy`, `recoveredItems`, `logs`
- **`GreenhouseSlot`** — 培养槽：`cropId`, `growthProgress`(0-100), `growthTimeLeft`, `isWatered`
- **`Survivor`** — 同伴状态：`role`, `bonus`, `isAssigned`, `realityLocationId`

### 账号与存档管理
* **多存档机制**：系统支持多用户切换。默认积分为 `Guest`。
* **本地存档**：
  * 存档内容以 JSON 字符串形式保存在 `localStorage` 中，键名为 `aether_garden_save_${username}`。
  * 用户列表保存在 `aether_garden_accounts_list` 中。
  * 当前选中的用户保存在 `aether_garden_save_current_user`。
* **自动存档**：`GameContext` 监控 `state` 的变化，秒级自动写入本地 `localStorage`。

---

## 3. 核心游戏系统 (Gameplay Modules)

### 3.1 温室种植系统 (`ShelterTab.tsx` 内置)
温室的种植、浇水、收割功能集成在 `ShelterTab.tsx` 中，与该页签的避难所管理共享 UI。
* **作物配置**：定义在 `src/data/crops.ts` 的 `CROPS_CONFIG` 中，包含 7 种作物（辐射荧光草、以太浆果、钢纹向日葵、熔岩椒、霜冻风铃草、等离子南瓜、虚空魔莲）。
* **时间流逝**：支持**离线成长逻辑**。在初始化或每秒 Tick 时计算时间差。
* **灌溉机制**：浇水消耗 2 点魔能，使作物成长速度翻倍。
* **一键操作**：`batchWater`（批量浇水）、`batchHarvest`（批量收割）、`batchPlant`（批量种植荧光草）。
* **温室扩建**：制作特殊配方 `greenhouse_expansion` 可将槽位扩充至 8 个。

### 3.2 工坊制造与生存补给 (`WorkshopTab.tsx`)
* **图纸系统** (`src/data/recipes.ts`)：使用 `RECIPES_CONFIG` 驱动列表渲染。每个配方包含 `cost`（消耗）、`reward`（产出）、`special`（特殊标记如胶囊充能/温室扩建）。
* **生存补给**：折叠面板展示可消耗品（`hot_stew`、`nanite_injector`、`purifying_serum`），点击直接使用。
* **制作制造**：消耗魔能 `energy` 制作物品。若诺娃(Nova)已解锁，魔能消耗降低 20%。
* **胶囊充能**：`sanity_capsule` 和 `warp_capsule` 通过特殊配方充能，充能次数存储在 `exploration.capsulesCharge`。

### 3.3 地表探索与同伴营救 (`WildernessTab.tsx`)
* **卡牌滑动交互**：引入了 `SwipeCard.tsx`。玩家可以通过左滑/右滑卡牌做出选择。
* **临时背囊机制**：探索中的收益和损失先计入 `exploration.realityBag`：
  * **负向扣除防护**：扣除物品的最大量不能超过 `主背包 + 临时背包` 的总和。
  * **负向红字提示**：临时背囊中若为负数，将以红字高亮提醒损失。
  * **安全撤退/救援成功**：数据合并至主背包并清空临时背囊。
  * **探索死亡**：扣除临时背囊的全部战利品，不影响主背包。
* **救援任务**：当幸存者共鸣度达 100% 后，解锁现实坐标。在第 5 步触发特殊救援事件。

### 3.4 心灵梦境探索 (`DreamscapeTab.tsx`)
* **入梦消耗**：潜入梦境需要消耗理智值。
* **梦境污染**：每步积累污染度，达到 100% 触发"梦境泄露"警报，扣除 60 点生命值。
* **同伴共鸣**：梦境事件可以解锁同伴在现实地表的救援坐标。共鸣度通过 `survivorResonance` 追踪，目标幸存者由 `targetSurvivorId` 标记。
* **梦胶囊**：`sanity_capsule`（恢复理智）和 `warp_capsule`（跃迁）通过工坊充能后使用。

### 3.5 避难所后勤与自动化 (`ShelterTab.tsx`，约 1509 行)
避难所管理是游戏的核心中后期系统，包含以下子系统：
* **设施升级**：发电机（离线魔能产出）、蓄电池（离线收益上限延长）、回收站（自动收集废金属）。
* **自动化流水线**：`smelter`（熔炼合金）和 `assembler`（组装口粮/能量剂/炮塔）。可指派幸存者提高效率。
* **挂机派遣探索**：选择目的地（雷达站/地铁站/生化实验室）派遣幸存者挂机自动拾荒，按间隔时间产出物资。
* **幸存者岗位分配**：指派特定幸存者从事自动浇水或挂机探索。
* **离线收益结算**：重连时弹出 `OfflineReport` 弹窗，展示离线期间避难所自动运转的累计收益。

### 3.6 数据驱动设计系统 (Data-Driven System)
游戏的各项数据、遭遇、配方和物品全数采用**数据驱动（Data-Driven）**的解耦设计，所有配置文件集中在 `src/data/` 目录下，类型定义集中在 `src/types/config.ts`。

* **类型定义 (`config.ts`)**：`PassiveEffect`、`CostFormula`、`UpgradeEffect`、`UpgradePath` 等纯配置接口。
* **物品系统 (`items.ts`)**：`ITEMS_CONFIG` 统一定义物品元数据（ID、中文名、Emoji、描述、分类、`useEffect`），引擎和 UI 直接读取。
* **配方系统 (`recipes.ts`)**：`RECIPES_CONFIG` 驱动工坊渲染，每种配方含 `cost`、`reward`、`special` 标记。
* **作物系统 (`crops.ts`)**：`CROPS_CONFIG` 定义 7 种作物（生长时间、产出、种子消耗、图片）。
* **自动流水线 (`autoRecipes.ts`)**：`AUTO_RECIPES` 定义冶炼炉/组装台的自动配方（输入、输出、耗时、所属设施 `facilityId`）。
* **卡牌事件系统 (`realityEvents.ts` / `dreamEvents.ts` / `rescueEvents.ts`)**：
  * `RealityEvent` 和 `DreamEvent` 结构体包含 `type`（事件类型）、`weight`（出现权重）、`choices(A/B)` 及 `requirements`（前置物资门槛）。
  * `RESCUE_EVENTS` + `RESCUE_LOCATION_MAP` 驱动 6 个救援事件的位置映射。
  * 梦境事件额外支持 `targetSurvivorId`（共鸣目标）和 `resonance` 值。
* **探险地点 (`expeditionLocations.ts`)**：`EXPEDITION_LOCATIONS` 定义现实探索目的地（战利品表、所需角色、`displayName`/`shortName`）。
* **同伴档案 (`survivors.ts`)**：6 位幸存者的基础数据（ID、角色、Emoji、背景故事、梦境触发文本、救援地点、效率加成、`passives` 被动效果数组）。
* **升级路径 (`shelterUpgrades.ts`)**：`SHELTER_UPGRADES` 定义 5 个设施的升级费用公式与效果增量。
* **游戏常量 (`gameConstants.ts`)**：`GAME_CONSTANTS` 集中定义游戏数值（游戏天秒数、浇水能耗、温室上限、探索消耗等）。
* **梦魇配置 (`nightmareConfig.ts`)**：`NIGHTMARE_CONFIG` 定义梦魇防御数值（炮塔伤害、超频能耗/伤害、梦境泄露伤害）。
* **初始状态 (`initialState.ts`)**：`INITIAL_STATE` + `INITIAL_PLAYER_STATS` 定义游戏初始状态，被 GameContext 导入使用。

---

## 4. 幸存同伴与生存被动技能 (Survivor Passives)
当同伴被营救回避难所后（清除 `realityLocationId` 坐标），其被动加成立刻全局生效：

1. **工程师：罗伊 (Roy)**
   * **加成**：工坊能耗 -20%
   * **救援地点**：雷达站废墟 (radar_station)

2. **农学家：阿梅 (Mei)**
   * **加成**：温室作物生长速度 +25%
   * **救援地点**：温室废墟 (green_ruins)

3. **信使：赛罗 (Zero)**
   * **加成**：地表探索消耗 -15%
   * **救援地点**：高频信号塔 (signal_tower)

4. **前哨卫兵：凯瑟琳 (Catherine)**
   * **加成**：所有行动饱食度与生命消耗降低 15%
   * **救援地点**：生化实验室 (bio_lab)

5. **机械搜寻犬：巴斯特 (Buster)**
   * **加成**：野外搜寻时，获得的`scrap_metal`数量提升 30%
   * **救援地点**：坍塌地铁站 (collapsed_subway)

6. **机甲驾驶员：诺娃 (Nova)**
   * **加成**：最大魔能上限提升 30 点 & 核心超频防守消耗降低
   * **救援地点**：军事仓库 (military_depot)

---

## 5. 云端同步系统 (`CloudSyncWidget.tsx` & `lib/supabase.ts`)
* **架构方案**：项目采用 **Supabase** 作为后端数据库。
* **密匙存储**：Vite 自动读取 `.env` 中配置的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
* **密钥静默记忆**：密匙记录到 `localStorage` 的 `aether_garden_sync_key_${currentUser}` 中。
* **直插式同步 (`setState(parsedState)`)**：数据从云端下载后直接覆盖 React 全局状态和 localStorage。
* **优雅降级**：Supabase 连接为可选功能。当 `.env` 未配置时，CloudSyncWidget 不显示，游戏仅使用 localStorage 正常运行。

---

## 6. 项目文件索引地图 (File Sitemap)

```
IdleCozyGame/
├── docs/
│   └── project_architecture.md        # 本项目架构说明书
├── src/
│   ├── assets/                        # UI 插画与作物图片资源 (JPG/PNG)
│   ├── types/
│   │   ├── game.ts                    # 全局 TypeScript 接口声明 (GameState, PlayerStats, ShelterStats 等)
│   │   └── config.ts                  # 配置类型接口 (PassiveEffect, CostFormula, UpgradePath 等)
│   ├── data/                          # 静态配置数据表（全数据驱动）
│   │   ├── items.ts                   # 物品与元数据元组 (含 useEffect)
│   │   ├── recipes.ts                 # 配方列表（工坊图纸/胶囊充能/温室扩建）
│   │   ├── survivors.ts               # 同伴基础档案 (6 位幸存者 + passives)
│   │   ├── crops.ts                   # 作物配置 (7 种，含图片引用)
│   │   ├── autoRecipes.ts             # 自动流水线配方 (5 个，含 facilityId)
│   │   ├── expeditionLocations.ts     # 探险目的地 (3 个 + 4 救援点)
│   │   ├── rescueEvents.ts            # 救援事件 (6 个 + 位置映射表)
│   │   ├── shelterUpgrades.ts         # 设施升级路径 (5 个，含费用公式)
│   │   ├── gameConstants.ts           # 游戏常量 (天数/能耗/上限等)
│   │   ├── nightmareConfig.ts         # 梦魇防御数值配置
│   │   ├── initialState.ts            # 初始游戏状态
│   │   ├── realityEvents.ts           # 现实探索卡牌事件池（含类型/权重/要求）
│   │   └── dreamEvents.ts             # 梦境共鸣卡牌事件池（含幸存者目标标记）
│   ├── context/
│   │   ├── GameContext.tsx            # 全局状态引擎（从 src/data/ 导入所有配置）
│   │   ├── GameContext.test.tsx       # GameContext 核心逻辑测试
│   │   └── Account.test.tsx           # 账户管理测试
│   ├── components/                    # UI 组件与分页
│   │   ├── ShelterTab.tsx             # 避难所后勤（温室种植/设施升级/自动化流水线/挂机派遣/幸存者岗位分配）
│   │   ├── WorkshopTab.tsx            # 制造工坊（配方制造/生存补给折叠面板/梦魇防御控制台）
│   │   ├── WildernessTab.tsx          # 荒野地表探险（滑动卡牌/临时背囊/救援阶段）
│   │   ├── DreamscapeTab.tsx          # 心灵梦境（梦胶囊/污染度/同伴共鸣）
│   │   ├── LogTab.tsx                 # 避难所无线电日志（过滤/幸存者图鉴）
│   │   ├── SwipeCard.tsx              # 滑动卡牌组件（Touch 与 Mouse 事件，含 requirement 校验）
│   │   ├── ToastSystem.tsx            # 吐司消息与确认弹窗系统
│   │   └── CloudSyncWidget.tsx        # 云同步端点小部件（Supabase 接入/密钥记忆）
│   ├── lib/
│   │   └── supabase.ts                # Supabase 客户端初始化（优雅降级处理）
│   ├── App.tsx                        # 主框架入口（5 页签导航：日志/工坊/探索/后勤/梦境，探险锁定，离线弹窗）
│   ├── main.tsx                       # App 挂载与 Provider 包裹
│   ├── index.css                      # Tailwind v4 引入与全局主题（暗色废土风格）
│   ├── expansion.test.tsx             # 生存补给与被动效果的集成测试
│   └── smoke.test.ts                  # 基础冒烟测试
```
