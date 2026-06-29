# 避难所智能自动化加工与挂机系统设计文档

本文档详述了《废土魔导温室》游戏中关于“挂机（离线/放置）机制增强”、“避难所基建升级”、“幸存者岗位指派”以及“时间驱动的工厂套娃流水线”的完整设计。

---

## 1. 系统概述与核心机制

本系统致力于构建一个**「材料自动产出 -> 设施时间加工 -> 高级物品产出 -> 科技/探索再投入」**的闭环。

### 1.1 自动生产流水线
避难所中存在若干自动设施（包含最基础的温室，以及魔导冶炼炉和微型芯片组装台）。
- 玩家可以在设施中选择配方并启用。
- 只要背包中有足够的原材料，设施就会持续以秒为单位消耗原料并生成产物。
- 离线挂机时，系统会计算这段时间里加工设施的理论最大生产次数，并结合背包原料库存限制折算实际产出。

### 1.2 避难所基建与挂机属性
引入以下挂机/放置加成属性：
- **最大挂机结算时长 (`maxOfflineDuration`)**：限制玩家离线结算收益的最长时间。初始为 4 小时，可升级蓄电池扩展。
- **发电机等级 (`generatorLevel`)**：影响每小时自动魔能恢复（Energy Recovery）。
- **物资收集器等级 (`recyclerLevel`)**：影响每小时自动生成的废金属、塑料等基础材料。
- **幸存者岗位加成 (`jobs`)**：指派不同的幸存者到对应岗位，会使对应设施（如冶炼炉、微组装台、温室、派遣探索）的加工效率或产出获得大幅度加成。

### 1.3 挂机远征派遣 (Expedition)
- 玩家指派某位幸存者带着补给品去荒野/梦境的特定已解锁地点进行长期挂机探索。
- 探索期间，根据地点的“拾荒间隔 (scavengeInterval)”，每隔一段时间就模拟一次捡垃圾，产出基础材料并存入仓库。

---

## 2. 详细设计：数据结构扩展 (`src/types/game.ts`)

为了支持新挂机系统，我们将对 `src/types/game.ts` 进行如下修改和扩展：

### 2.1 幸存者状态扩展
在 `Survivor` 接口中，增加支持挂机岗位：
```typescript
export interface Survivor {
  id: string;
  name: string;
  role: "farmer" | "engineer" | "scout";
  bonus: number;            // 效率提升比例（例如 0.15 表示提升15%）
  isAssigned: boolean;      // 是否已指派工作
  assignedSlotId?: number;  // 指派的温室槽位
  assignedJobId?: string | null; // 派驻的避难所岗位 ID：'waterer' | 'smelter' | 'assembler' | 'expedition'
  realityLocationId?: string;
}
```

### 2.2 设施与配方定义
```typescript
export interface AutoRecipe {
  id: string;
  name: string;
  input: Record<string, number>;
  output: Record<string, number>;
  duration: number; // 单次生产耗时（秒）
}

export interface AutomationFacility {
  id: string;                     // 'smelter' | 'assembler'
  name: string;
  level: number;                  // 设施等级，可通过消耗材料升级以缩短 duration
  activeRecipeId: string | null;  // 当前选择配方
  currentProgress: number;        // 单次加工进度 0-100
  timeLeft: number;               // 剩余加工时间（秒）
  assignedSurvivorId: string | null;
}
```

### 2.3 避难所基建与挂机状态 (`GameState` 扩展)
```typescript
export interface GameState {
  // ... 原有属性
  shelter: {
    maxOfflineDuration: number;   // 离线时间上限，默认 14400 秒 (4小时)
    batteryLevel: number;         // 蓄电池等级，升级提升离线时长
    generatorLevel: number;       // 发电机等级，升级提升离线魔能产量
    recyclerLevel: number;        // 回收站等级，升级提升离线废料产量
    facilities: Record<string, AutomationFacility>;
    
    // 岗位分配
    assignedWatererId: string | null;   // 指派自动浇水的幸存者ID (Mei 优先)
    assignedExplorerId: string | null;  // 指派挂机探索的幸存者ID (Buster 优先)
    
    // 挂机派遣状态
    expedition: {
      locationId: string | null;       // 派遣目的地，如 'radar_station'
      startTime: number | null;
      lastScavengeTime: number | null;  // 上次拾荒计算时间戳
    };
  };
}
```

---

## 3. 详细设计：算法与离线结算逻辑

### 3.1 在线 Tick 周期计算 (`1秒一次`)
在 `src/context/GameContext.tsx` 的秒级定时器中：
1. **自动资源产出**：
   - 魔能产生：每秒增加 `generatorLevel * 0.005` 点魔能（相当于每小时 `generatorLevel * 18` 点）。
   - 废料收集：每秒增加 `recyclerLevel * 0.002` 个 `scrap_metal` 废铁（相当于每小时 `recyclerLevel * 7.2` 个，概率折算）。
2. **挂机探索产出**：
   - 如果派驻了幸存者在挂机探索，每秒检测是否达到了 `scavengeInterval`。如果是，则按掉落表爆料。
3. **工厂流水线加工**：
   - 遍历各生产线（冶炼炉、微组装台）。
   - 若 `activeRecipeId !== null`：
     - 如果 `timeLeft <= 0` 且背包有足够原料，消耗原料并开始一轮生产，`timeLeft` 设为配方时间。
     - 若正在加工中，`timeLeft` 扣减 1 秒。当 `timeLeft` 归 0 时，产出加入背包。
     - 派驻的幸存者会提供乘算加速：`实际耗时 = 基础耗时 / (1 + 幸存者 bonus)`。

### 3.2 离线结算公式 (Offline Progress)
在玩家加载游戏时，根据当前时间与 `lastTick` 算出 `elapsedSeconds = (now - lastTick) / 1000`。
若 `elapsedSeconds > maxOfflineDuration`，截断为 `maxOfflineDuration`。

执行离线结算序列：
1. **离线自动产出与挂机探索**：
   - 结算发电机魔能增益：`recoveredEnergy = Math.floor(elapsedSeconds * (generatorLevel * 0.005))`。
   - 结算回收站废料增益：`recoveredScrap = Math.floor(elapsedSeconds * (recyclerLevel * 0.002))`。
   - 结算挂机探索派遣：
     - 计算离线期发生的探索次数：`expeditionTicks = Math.floor(elapsedSeconds / scavengeInterval)`。
     - 依次循环这些次数，根据目的地的掉落概率，获得物资，加入到结算临时清单。
2. **离线工厂流水线模拟**：
   - 对于每个激活配方的工厂设施：
     - 单次加工实际时间为 `t = duration / (1 + survivorBonus)`。
     - 离线时间在此设施中能支持的**最大加工次数**为 `maxCycles = Math.floor(elapsedSeconds / t)`。
     - 计算**消耗背包原材料**能支持的**极限加工次数**为 `limitCycles = Math.min(...背包原料 / 单次配方消耗)`。
     - 最终执行次数 `actualCycles = Math.min(maxCycles, limitCycles)`。
     - 背包扣除原材料，加入产出到背包，并把产出的材料也加入结算临时清单。
3. **离线温室作物生长**：
   - 若指派了自动浇水幸存者，则生长时间扣减以 `2` 倍速进行；否则按未浇水 `1` 倍速处理。

最后，上线后自动弹出**「离线/挂机收益结算弹窗」**，汇总向玩家展示：
- 离线累计时间
- 自动产出的魔能和基础废料
- 派遣探索带回的物资
- 加工厂自动套娃产出的高级材料（如合金板、口粮）
- 作物成熟的提示

---

## 4. UI 界面布局 (`ShelterTab.tsx`)

新增 **「避难所 (Shelter)」** 标签页，界面按如下模块排布：

1. **避难所基建与挂机控制 (Base Upgrades)**
   - 顶栏展示当前的挂机效率面板：
     - 🔋 离线最大续航：`X 小时` (可点击升级蓄电池)
     - ⚡ 魔能凝结率：`+X / 小时` (可点击升级魔能发电机)
     - 🔧 废土回收率：`+X / 小时` (可点击升级物资回收站)
2. **温室控制中心 (Greenhouse Station - 基础工厂)**
   - 汇总展示温室的播种和成熟状况（如“3 个槽位有作物，1 个已成熟”）。
   - 统一指派托管农夫（阿梅），并显示自动灌溉状态（“Mei 托管中：全自动温室灌溉中，生长速度 x2”）。
   - 提供“一键浇水”、“一键收获并循环播种”按钮。
3. **工业自动生产流水线 (Automated Assemblers)**
   - 左右并列两个核心工厂：**魔导冶炼炉** 与 **芯片微组装台**。
   - 每个工厂有以下操作：
     - 选择指派的工程师，获得对应的加工加速。
     - 选择要自动生产的配方（可下拉切换）。
     - 开启/关闭按钮。
     - 显示正在生产的进度条和倒计时。
4. **挂机探索远征 (Base Expeditions)**
   - 指派一名幸存者带足口粮前往荒野地点进行挂机。
   - 选择地点（如“废弃地铁站”、“雷达站”），点击“开始挂机派遣”。
   - 挂机中会实时更新“已探索时间”和“预计拾荒所获材料”。

---

## 5. 配方与挂机远征数值平衡设计

### 5.1 自动生产线配方
| 设施 | 配方名称 | 输入原料 | 产出原料 | 基础耗时 |
| :--- | :--- | :--- | :--- | :--- |
| **魔导冶炼炉** | 提炼合金金属板 | 🔧 废旧金属 x2 | 🔩 合金金属板 x1 | 30 秒 |
| **魔导冶炼炉** | 钢纹向日葵熔炼 | ⚙️ 钢纹花瓣 x3, 🔧 废铁 x1 | 🔩 合金金属板 x2 | 45 秒 |
| **微型组装台** | 自动合成压缩口粮 | 🌿 荧光草纤维 x3 | 🍱 压缩口粮 x1 | 20 秒 |
| **微型组装台** | 能量补充剂组装 | 🌿 荧光草纤维 x2, 🔧 废铁 x1 | ⚡ 能量补充剂 x1 | 40 秒 |
| **微型组装台** | 防御炮塔装配 | 🔧 废铁 x3, 🌿 荧光草纤维 x3 | 🗼 防御炮塔 x1 | 90 秒 |

### 5.2 挂机远征派遣地点
| 派遣地点 | 角色要求 | 拾荒间隔 | 掉落几率与数量范围 |
| :--- | :--- | :--- | :--- |
| **雷达站废墟** | 无限制 | 300 秒 | 🔧 废旧金属 (70%, 1-2个), ⚡ 能量补充剂 (10%, 1个), 🌱 荧光草种子 (20%, 1个) |
| **坍塌地铁站** | 侦察兵 (Scout) | 240 秒 | 🔧 废旧金属 (80%, 1-3个), ⚙️ 钢纹花瓣 (30%, 1-2个), 🌱 以太浆果种子 (15%, 1个) |
| **生化实验室** | 工程师 (Engineer) | 360 秒 | ✨ 魔能之尘 (50%, 1-2个), 💠 梦境碎片 (20%, 1个), 💊 稳定胶囊 (10%, 1次充能) |
