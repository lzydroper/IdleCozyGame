# 避难所物品雪碧图 (Spritesheet) Nano Banana 2 Pro 生成与分类指南

本指南针对 **Nano Banana 2 Pro (Stable Diffusion 基于 SDXL 规格的生成器)**，为您量身定制了全新的**分门别类雪碧图生成方案**。

通过将物品按照逻辑分为三类，每张图生成标准的 **4x4 = 16 宫格**。不仅能获得极高的图标清晰度，也更符合 AI 的风格化生成规律。对于物品不足 16 个的类别，我们已经为您编造了契合世界观的魔导废土资源凑满 16 宫格。

---

## 共享规格与位置要求

1. **单张雪碧图排列**：固定为 **4 列 x 4 行 = 16 个图标**。
2. **长宽比例**：必须生成完美的正方形图片（例如 `1024x1024` 或 `512x512` 像素）。
3. **背景要求**：建议生成时采用**纯黑背景(black background)**或**透明背景**，便于后续去底抠图为透明 PNG 格式。
4. **命名与存放位置**：
   - 种子与魔导植物类：`public/assets/spritesheet_seeds.png`
   - 废土材料与能量结晶类：`public/assets/spritesheet_materials.png`
   - 生存道具与魔导设备类：`public/assets/spritesheet_supplies.png`

---

## 一、 种子与魔导植物类 (spritesheet_seeds.png)

- **网格排列**：4x4 = 16 宫格。
- **网格索引表（横向扫描，从 0 到 15）**：

| 索引 | 物品 ID | 物品名称 | 视觉特征描述 |
| :--- | :--- | :--- | :--- |
| **0** | `seed_glow_grass` | 荧光草种子 | 散发微弱淡蓝色冷光的科幻发光植物种子 |
| **1** | `seed_aether_berry` | 以太浆果种子 | 闪烁着蓝色晶莹能量流光的浆果种子 |
| **2** | `seed_steel_sunflower`| 钢纹向日葵种子 | 带有金属拉丝质感和暗金色纹理的向日葵大粒种子 |
| **3** | `seed_magma_pepper` | 熔岩椒种子 | 表面隐约透出熔岩般红橙色发热裂纹的种子 |
| **4** | `seed_frost_bell` | 霜冻风铃草种子 | 浅蓝色、表面覆盖有一层薄薄寒白霜的冰霜种子 |
| **5** | `seed_plasma_pumpkin` | 等离子南瓜种子 | 金黄色、表面隐隐有电磁波纹或电弧跳跃的电感种子 |
| **6** | `seed_void_lotus` | 虚空魔莲种子 | 漆黑色、中心带有一丝深紫色星空般裂缝的魔性种子 |
| **7** | `seed_echo_shroom` | 回音真菌孢子(新) | 散发淡粉色圈状光晕的魔法菌菇孢子囊 |
| **8** | `seed_magnetic_clover`| 磁力三叶草种子(新) | 带有金属光泽、叶片呈偏心磁铁形态的种子 |
| **9** | `seed_solar_cactus` | 烈阳仙人掌球(新) | 散发微弱暖橙色光的带刺小仙人掌种球 |
| **10** | `seed_stellar_rose` | 星辰玫瑰种子(新) | 亮蓝色多面体结晶形态的花卉种子 |
| **11** | `seed_nebula_moss` | 星云苔藓孢子(新) | 瓶中含有紫色星团烟雾的细小苔藓孢子颗粒 |
| **12** | `seed_storm_sprout` | 雷暴幼芽种子(新) | 带有隐约金色闪电裂纹与焦黑表皮的种子 |
| **13** | `seed_crystal_reed` | 水晶芦苇根茎(新) | 莹白色半透明的坚硬芦苇根茎块 |
| **14** | `seed_shadow_fern` | 暗影蕨孢子(新) | 吞噬周围光线、呈黑雾气泡包裹的孢子团 |
| **15** | `seed_chrono_vine` | 时光藤蔓种子(新) | 呈双螺旋结构微弱旋转的发光翠绿色种子 |

### Nano Banana 2 Pro 生成提示词 (种子类)
> **Positive Prompt (正向)**:
> `a game spritesheet sheet containing 16 unique magic plant seeds and magical botanical items, arranged in a perfect 4x4 grid. Glowing alien seeds, bio-luminescent spores, cyber-organic flower seeds, magic mushrooms. Cozy post-apocalyptic, cyberpunk meets fantasy style. 2D vector style icon, flat game UI design, bright neon glow, clean gradients, high detailed, colorful, black background for easy keying`
>
> **Negative Prompt (反向/负面)**:
> `3d, realistic, photorealistic, photography, blurred, ugly, text, human, monsters, white background, messy layout, uneven rows`

---

## 二、 废土材料与能量结晶类 (spritesheet_materials.png)

- **网格排列**：4x4 = 16 宫格。
- **网格索引表（横向扫描，从 0 到 15）**：

| 索引 | 物品 ID | 物品名称 | 视觉特征描述 |
| :--- | :--- | :--- | :--- |
| **0** | `glow_fiber` | 荧光草纤维 | 散发淡蓝色冷光的科幻植物发光纤维束 |
| **1** | `mana_dust` | 魔能之尘 | 闪烁着紫色粒子尘埃的魔力发光瓶 |
| **2** | `aether_pulp` | 以太果肉 | 富含蓝色以太流光的浆果果肉块，晶莹剔透 |
| **3** | `steel_petal` | 钢纹花瓣 | 带有金属拉丝拉纹、暗金色锋利边缘的植物花瓣 |
| **4** | `alloy_plate` | 合金金属板 | 废土重工业风的轻量化合金钢板，带防滑纹或铆钉 |
| **5** | `scrap_metal` | 废旧金属 | 废弃的锈蚀齿轮、管道接头和废电线组合成的破烂零件 |
| **6** | `magma_core` | 熔岩核心碎片 | 散发刺眼红橙色高温红光的熔岩椒提取结晶核 |
| **7** | `frost_crystal` | 冰晶结晶 | 冰蓝色、半透明折射寒冷光芒的辐射变异晶体 |
| **8** | `plasma_cell` | 等离子电芯 | 表面流淌着金色电弧与电路纹理的巨型圆筒状电能电池 |
| **9** | `void_essence` | 虚空精华 | 散发星空般深邃紫色微光的密封魔药试剂瓶 |
| **10** | `aether_ingot` | 以太魔导合金锭(新) | 亮蓝色发光的高纯度魔导合金砖块 |
| **11** | `crystal_silicon` | 晶体硅面板(新) | 表面带有蓝色反光折射面的废土精密电子硅基母板 |
| **12** | `nanite_slurry` | 纳米修复泥(新) | 装着莹绿色活性修复物质的密封高科技玻璃试管 |
| **13** | `nightmare_tear` | 梦魇之泪(新) | 纯黑色、不断冒着黑色魔性迷雾的小小密封玻璃瓶 |
| **14** | `rusted_spring` | 生锈弹簧零件(新) | 机械感生锈的重型压缩弹簧和减震组件 |
| **15** | `plasma_arc` | 等离子弧能核心(新)| 带有金色线圈包裹和亮色球形电能的弧光核心 |

### Nano Banana 2 Pro 生成提示词 (材料类)
> **Positive Prompt (正向)**:
> `a game spritesheet sheet containing 16 post-apocalyptic resource materials and energy crystals, arranged in a perfect 4x4 grid. Including: glowing magic vials, alloy steel plates, mechanical gear scraps, orange volcano cores, blue ice crystals, cyber cells, purple potion bottles. Cozy post-apocalyptic cyberpunk style. 2D vector style icon, flat game UI design, bright neon glow, high detailed, black background`
>
> **Negative Prompt (反向/负面)**:
> `3d, realistic, photo, blurred, text, human, animal, white background, messy rows, perspective shadows`

---

## 三、 生存道具与魔导设备类 (spritesheet_supplies.png)

- **网格排列**：4x4 = 16 宫格。
- **网格索引表（横向扫描，从 0 到 15）**：

| 索引 | 物品 ID | 物品名称 | 视觉特征描述 |
| :--- | :--- | :--- | :--- |
| **0** | `ration` | 压缩口粮 | 银色锡箔纸真空包装的废土口粮包，带有指示标签 |
| **1** | `energy_refill` | 能量补充剂 | 充满亮蓝色液体的魔能注射枪或科幻能量罐 |
| **2** | `defensive_turret` | 防御炮塔 | 一座微型便携式防卫哨戒机枪塔，有枪管和感应雷达 |
| **3** | `sanity_capsule` | 稳定胶囊 | 紫白相间的精神镇定胶囊药丸，散发温和紫色光环 |
| **4** | `warp_capsule` | 跃迁胶囊 | 散发神秘蓝色空间符文光芒的时空胶囊或球形发生器 |
| **5** | `dream_shard` | 梦境碎片 | 从梦境深处捕获的多面体粉紫色透明发光碎裂晶体 |
| **6** | `hot_stew` | 魔能熔岩热烩 | 盛有红色汤汁、冒着热气与能量微光的炖菜金属大碗 |
| **7** | `nanite_injector` | 纳米修复注射针 | 带有翠绿色药液的双管纳米皮肤高压修复注射枪 |
| **8** | `purifying_serum` | 心灵净化血清 | 装有粉蓝色发光透明液体的注射瓶，代表思维纯净 |
| **9** | `shield_battery` | 重载护盾电池 | 厚重科技感电能电池，带有护盾投影发光图案 |
| **10** | `ration_deluxe` | 高级生存罐头(新) | 印有红色爱心徽标和铁皮密封扣的废土罐头 |
| **11** | `stimpack` | 废土肾上腺素(新) | 橙色瞬时急救药剂针管，代表红血时的极限求生 |
| **12** | `geiger_counter` | 盖革探测仪(新) | 黄色外壳、带有科幻刻度表盘和雷达扫描的手持探测仪 |
| **13** | `canteen` | 军用水壶(新) | 带迷彩保温护套和电子屏显示的科技感军用大水壶 |
| **14** | `deflective_lens` | 偏光魔导镜片(新)| 折射七彩极光的六角形魔导透镜 |
| **15** | `dream_lantern` | 引梦魔灯(新) | 散发深蓝色星光光晕、带有魔导浮雕的复古手提挂灯 |

### Nano Banana 2 Pro 生成提示词 (道具类)
> **Positive Prompt (正向)**:
> `a game spritesheet sheet containing 16 post-apocalyptic survival items and high-tech devices, arranged in a perfect 4x4 grid. Including: military rations, medical syringe guns, mini robotic turrets, blue force-field batteries, retro lanterns, sci-fi canteen. Cozy post-apocalyptic cyberpunk style. 2D vector style icon, flat game UI design, vibrant neon glows, high detailed, black background`
>
> **Negative Prompt (反向/负面)**:
> `3d, realistic, photo, messy layout, white background, text, human, uneven columns, blurry`

---

## 四、 幸存者头像雪碧图 (3x3 网格)

为了拼满标准的正方形网格，我们采用 **3列 x 3行 = 9个格子** 布局。除当前游戏中存在的 6 个主要角色外，我们额外补充了 3 个具有废土科幻设定的备用角色，便于生成完美的方形网格头像。

- **网格索引表（从左到右，从上到下，从 0 开始计数）**：

| 索引 | 幸存者 ID | 姓名 | 职业类型 | 视觉特征与背景描述 |
|:---|:---|:---|:---|:---|
|**0**|`roy`| 罗伊 | 工程师 | 前废土矿山工程师。硬朗沉稳的中年男性，脸上有些许胡茬，戴着机械防镜和标志性的黄色工程师安全帽。 |
|**1**|`mei`| 阿梅 | 农学家 | 辐射温室研究员。温婉知性的年轻女性，神情温柔，戴着一顶编织草帽，耳边别着一株细碎的荧光植物。 |
|**2**|`zero`| 赛罗 | 侦察兵 | 废土信使。精悍、目光敏锐的短发青年，穿着防风兜帽斗篷，戴着大号的防尘护目镜，面带坚毅。 |
|**3**|`catherine`| 凯瑟琳 | 农学家 | 辐射防治所前主任。干练冷静的中年女性医生，戴着细框眼镜，神情专业且略带严肃，穿着高领防护便装。 |
|**4**|`buster`| 巴斯特 | 侦察兵 | 废土清道夫硬汉。面容粗犷，留着钢针般的灰色短发，右眼戴着黑色眼罩，穿着厚重的铁片改装皮甲。 |
|**5**|`nova`| 诺娃 | 工程师 | 前联合防卫军魔导机甲驾驶员。性格豪爽泼辣的短发女性，红褐色乱发，穿着醒目的魔导橙色驾驶紧身衣。 |
|**6**|`soldier`| 铁卫（备用） | 卫兵 (Guard) | 避难所防御队长。神情严肃的硬派士兵，头戴全覆式钢铁呼吸面罩，身穿厚重的避难所装甲。 |
|**7**|`healer`| 艾拉（备用） | 药剂师 (Chemist) | 避难所药剂配方师。戴着半透明防护口罩和淡蓝色头巾的女研究员，神情专注，身旁有化学试管。 |
|**8**|`apprentice`| 小米（备用）| 拾荒学徒 | 机灵好奇的小女孩，扎着双马尾，戴着防毒面罩，脖子上挂着大号螺丝刀，眼神充满好奇。 |

### 幸存者 AI 生成 Prompt

> **Prompt**: `A survivor avatar spritesheet sheet containing 9 distinct wasteland character portraits, arranged in a perfect 3x3 grid. The characters include: 1. a rugged male engineer with safety goggles, 2. a gentle female botanist wearing a straw hat, 3. a swift young male scout with a windproof hood and goggles, 4. a smart female doctor with glasses, 5. a scarred veteran scavenger with a black eyepatch, 6. a tomboy female mech pilot in orange suit, 7. a heavy armored male security guard wearing a breathing mask, 8. a female chemist in a hazmat coat with face mask, 9. a young scavenge apprentice girl with goggles and dual pigtails. Cozy anime game style, styled in futuristic cyberpunk cozy post-apocalyptic UI icon pack, matching lighting, colorful backgrounds, clean 2D vector style, transparent background --v 6.0`



---

## 五、 页面代码引用配置

代码中已完成对应的分类路由，当检测到 `/assets/spritesheet_seeds.png`、`_materials.png` 及 `_supplies.png` 存在时，便会自动加载并按 4x4 的行、列精确显示对应图标。若某些图片缺失，将无缝安全退回显示原有 Emoji，保证游戏流畅无碍。
