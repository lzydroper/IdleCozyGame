# 废土魔导温室 (AetherGarden) 项目架构与系统文档

为了帮助后续接入的开发助手（AI）能够瞬间理解并接手本项目，本文档详细阐述了项目的核心设计、模块划分、运行机制以及状态流转。

---

## 1. 项目简介 (Overview)
`AetherGarden` 是一款废土魔导温室题材的放置经营（Idle Cozy）游戏。
玩家扮演一名废土避难所的幸存者，通过在温室种植魔法作物、在工坊制造装备与生存补给、潜入心灵梦境锁定同伴坐标，以及在地表荒野探索营救同伴，逐步扩大避难所规模，并抵御废土威胁。

---

## 2. 核心状态中心 (`GameContext.tsx`)
游戏的所有全局状态和核心业务逻辑均封装在 `src/context/GameContext.tsx` 中。

### 核心状态结构 (`GameState`)
```typescript
interface GameState {
  player: PlayerStats;       // HP, maxHP, food, maxFood, energy, maxEnergy, sanity, maxSanity, days
  inventory: Record<string, number>; // 避难所储藏箱（背包）
  greenhouse: {
    slots: GreenhouseSlot[]; // 培养槽状态（id, cropId, growthProgress, growthTimeLeft, isWatered）
    unlockedSlotsCount: number; // 当前已解锁的槽位数（上限 8 个）
  };
  survivors: Record<string, SurvivorState>; // 同伴状态（包含是否解锁、现实坐标、指派状态等）
  exploration: ExplorationState; // 现实探索与梦境探索的临时状态（包含临时背包 realityBag / dreamBag 等）
  discoveredBlueprints: string[]; // 已解锁的制造图纸
  activeAlert: { type: string | null; hp: number }; // 避难所紧急危机（如梦魇兽入侵）
  lastTick: number;          // 上一次心跳时间（用于离线生长时间计算）
  dayStartTime: number;      // 每一天开始的时间戳
  logs: LogEntry[];          // 无线电系统日志
}
```

### 账号与存档管理
* **多存档机制**：系统支持多用户切换。默认积分为 `Guest`。
* **本地存档**：
  * 存档内容以 JSON 字符串形式保存在 `localStorage` 中，键名为 `aether_garden_save_${username}`。
  * 用户列表保存在 `aether_garden_accounts_list` 中。
  * 当前选中的用户保存在 `aether_garden_save_current_user`。
* **自动存档**：`GameContext` 监控 `state` 的变化，秒级自动写入本地 `localStorage`。

---

## 3. 核心游戏系统 (Gameplay Modules)

### 3.1 温室种植系统 (`GreenhouseTab.tsx`)
* **作物配置** (`src/data/crops.ts`)：包括成长周期、消耗种子和产出。
* **时间流逝**：支持**离线成长逻辑**。在初始化或每秒 Tick 时计算时间差。
* **灌溉机制**：浇水消耗 2 点魔能，使作物成长速度翻倍。
* **一键灌溉 (`batchWater`)**：引擎层统一计算能量，在一次 React 更新周期内批量完成，避免多重异步 `setState` 竞争造成的数据错乱。
* **温室扩建**：制作特殊图纸配方 `greenhouse_expansion`（温室智能扩展坞）将激活温室扩建逻辑，最大可将槽位扩充至 8 个。

### 3.2 工坊制造与生存补给 (`WorkshopTab.tsx`)
* **图纸系统** (`src/data/recipes.ts`)：图纸分为材料加工、设备制造、生存补给和特殊配方。
* **生存补给**：
  * **魔能熔岩热烩 (`hot_stew`)**：食用后恢复饱食与生命值。
  * **纳米修复注射针 (`nanite_injector`)**：注射后快速修复生命损伤。
  * **心灵净化血清 (`purifying_serum`)**：清除大量心灵污染度，稳定理智。
* **折叠体验**：工坊中的生存补给面板支持折叠/展开，使后期游戏配方增多时界面依然整洁。

### 3.3 地表探索与同伴营救 (`WildernessTab.tsx`)
* **卡牌滑动交互**：引入了 `SwipeCard.tsx`。玩家可以通过左滑/右滑卡牌做出选择。
* **临时背囊机制**：探索中的收益和损失先计入 `exploration.realityBag`：
  * **负向扣除防护**：扣除物品（如事件损坏）的最大量不能超过 `主背包 + 临时背包` 的总和，防止资产扣成负数。
  * **负向红字提示**：临时背囊中若为负数，将以红字高亮提醒损失，撤退时安全核销。
  * **安全撤退/救援成功**：数据合并至主背包并清空临时背囊。
  * **探索死亡**：扣除临时背囊的全部战利品，不影响主背包。

### 3.4 心灵梦境探索 (`DreamscapeTab.tsx`)
* **机制**：潜入梦境需要消耗理智。
* **梦境污染**：每走一步都会积累污染度，如果污染度达到 100% 将触发“梦境泄露（梦魇入侵）”警报，在现实中扣除玩家 60 点生命值。
* **同伴共鸣**：梦境中的事件可以解锁同伴在现实地表的救援坐标（例如锁定雷达站、温室废墟或信号塔）。

### 3.5 数据驱动设计系统 (Data-Driven System)
游戏的各项数据、遭遇、配方和物品全数采用**数据驱动（Data-Driven）**的解耦设计，所有配置文件集中在 `src/data/` 目录下。这意味着无需修改 React 组件逻辑，仅需编辑配置文件即可扩展游戏内容。

* **物品系统 (`items.ts`)**：
  * 通过 `ITEMS_CONFIG` 统一定义物品元数据，包括 ID、中文名称、代表 Emoji、详情描述及分类（种子/材料/食物/装备/特殊）。
  * 游戏引擎与临时背囊等 UI 直接读取此数据字典进行显示与汉化，杜绝了硬编码文案。
* **配方系统 (`recipes.ts`)**：
  * 制造工坊的列表渲染完全由 `RECIPES_CONFIG` 驱动。
  * 每个配方包含：`cost`（配方消耗）、`yields`（产出）、`energyCost`（消耗魔能）、`category`（所属页签）以及是否默认解锁等。
  * 诺娃（Nova）的“过载减耗”被动直接读取配方的魔能消耗并动态计算，同时可过滤掉标记有 `special: true`（如温室扩建）的特殊配方。
* **卡牌事件系统 (`realityEvents.ts` / `dreamEvents.ts`)**：
  * 现实和梦境的探索事件均定义为 `RealityEvent` 和 `DreamEvent` 结构体数组。
  * **结构体定义**：
    ```typescript
    interface RealityEvent {
      id: string;
      title: string;
      description: string;
      choices: {
        A: EventChoice;
        B: EventChoice;
      };
    }
    interface EventChoice {
      text: string;                  // 选项文字说明
      requirements?: Record<string, number>; // 玩家主背包前提物资门槛（如：需防御炮塔x1）
      results: {
        stats?: { hp?: number; food?: number; energy?: number; sanity?: number; pollution?: number }; // 属性增减
        items?: Record<string, number>; // 获得或扣除物品（如：废铁 -5，熔岩核心 +1）
        logText: string;              // 做出选择后打印到日志面板的文本
      };
    }
    ```
  * 滑动卡片组件 `SwipeCard.tsx` 会读取当前卡牌的 `requirements` 进行置灰或校验，并根据 `results` 执行数值与物品的清算。

---

## 4. 幸存同伴与生存被动技能 (Survivor Passives)
当同伴被营救回避难所后（即清除 `realityLocationId` 坐标，状态标记为已解救），其独一无二的被动加成将立刻全局生效：

1. **工程师：罗伊 (Roy)**
   * **加成**：高级制造技术。
   * **效果**：解锁高级温室和高阶能源电池的配方权限。
2. **学者：诺娃 (Nova)**
   * **加成**：核心过载减耗。
   * **效果**：除了“温室扩建”等特殊配方外，工坊制造任何物品消耗的魔能（energy）**降低 10%**（向上取整，且最低消耗为 0）。
3. **前哨卫兵：凯瑟琳 (Catherine)**
   * **加成**：野外生存特训。
   * **效果**：在地表探索遭遇的负面事件中，受到的 HP 损失和饱食度损失**降低 15%**（四舍五入）。
4. **机械搜寻犬：巴斯特 (Buster)**
   * **加成**：废铁磁力收集。
   * **效果**：野外搜寻时，获得的废旧金属（`scrap_metal`）数量**提升 30%**（四舍五入）。

---

## 5. 云端同步系统 (`CloudSyncWidget.tsx` & `lib/supabase.ts`)
* **架构方案**：项目采用 **Supabase** 作为后端数据库。
* **密匙存储**：Vite 自动读取 `.env` 中配置的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
* **密钥静默记忆**：
  * 玩家首次在 `CloudSyncWidget` 中输入密匙并成功上传或下载后，密匙将被记录到本地 `localStorage` 的 `aether_garden_sync_key_${currentUser}` 中。
  * 下一次切换账户或重启终端时自动读取，无需玩家重复手输。
* **直插式同步 (`setState(parsedState)`)**：数据从云端下载解密后，直接覆盖 React 全局状态 and 本地 localStorage，玩家界面瞬间同步完毕，无需重新刷新网页。
* **云端数据表结构 SQL**：
  ```sql
  create table public.saves (
    username text not null,
    sync_key text not null,
    data jsonb null,
    updated_at timestamp with time zone null,
    constraint saves_pkey primary key (username)
  );
  ```

---

## 6. 项目文件索引地图 (File Sitemap)

```
IdleCozyGame/
├── docs/
│   └── project_architecture.md        # 本项目架构说明书
├── src/
│   ├── assets/                        # UI 插画与作物图片资源 (JPG/PNG)
│   ├── types/
│   │   └── game.ts                    # 全局 TypeScript 接口声明
│   ├── data/                          # 静态配置数据表
│   │   ├── items.ts                   # 物品与元数据元组
│   │   ├── recipes.ts                 # 配方列表 (Nova 减耗在此关联)
│   │   ├── survivors.ts               # 同伴基础档案 (Roy, Nova, Catherine, Buster)
│   │   ├── realityEvents.ts           # 现实探索卡牌事件池
│   │   └── dreamEvents.ts             # 梦境共鸣卡牌事件池
│   ├── context/
│   │   └── GameContext.tsx            # 全局状态引擎 (包含一键浇水、Nova被动、Buster加成等)
│   ├── components/                    # UI 组件与分页
│   │   ├── GreenhouseTab.tsx          # 魔导温室面板 (一键种植/一键收割/一键灌溉/扩建显示)
│   │   ├── WorkshopTab.tsx            # 制造工坊面板 (被动减耗UI/补给折叠)
│   │   ├── WildernessTab.tsx          # 荒野地表探险 (滑动卡牌/救援阶段/扣除边界控制)
│   │   ├── DreamscapeTab.tsx          # 心灵深海梦境 (稳定胶囊/污染度危机)
│   │   ├── LogTab.tsx                 # 避难所无线电日志 (同伴未救出时显示为防剧透占位符)
│   │   ├── CloudSyncWidget.tsx        # 云同步端点小部件 (Supabase接入/密匙记忆)
│   │   ├── SwipeCard.tsx              # 滑动卡片组件 (Touch与Mouse事件)
│   │   └── ToastSystem.tsx            # 吐司消息提醒系统
│   ├── App.tsx                        # 主框架入口 (底部玻璃化导航/首屏探索路由/终端控制台)
│   └── expansion.test.tsx             # 扩展生存补给与被动效果的集成测试用例
```
