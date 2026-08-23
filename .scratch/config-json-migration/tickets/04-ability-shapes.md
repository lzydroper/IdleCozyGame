# abilities 参数形状设计

Type: grilling
Status: resolved

## Question

abilities.ts 的 strike/aoe/heal 工厂外置后，json 里存什么：

1. **参数形状设计**：三类能力的 JSON 字段（id/name/description/targeting/cooldown/kind/value{kind,percent|flat}/passive?…），给出三份样例 json（awaken_buster / awaken_nova / awaken_healer 或基础技能）；
2. **工厂签名**：configs/factories/abilities.factory.ts 如何消费 json 形状产出 AbilityConfig；
3. **passive 能力**（lifesteal 等 triggers/effects）的 json 表达——与 EffectParamsMap 的对齐方式；
4. 每能力一文件（combat/abilities/<id>.json）vs 集合文件的最终确认。

## Answer

两问定稿（HITL，全按推荐案）。**关键发现改变了票面前提**：AbilityConfig 本身已是纯数据形状（FormulaTemplate/EffectTemplate/PassiveAbilityConfig 全部可 json 化），工厂只是 DRY 糖——

- **A1 形状策略 = 直存展开·工厂退役**：每个 `<abilityId>.json` 直存完整 AbilityConfig 字面量；strike/aoe/heal 工厂与 `configs/factories/` 目录**取消**（J4 铁律②在本域以「无需工厂」的方式满足）。样例：

  awaken_buster.json：
  ```json
  {
    "id": "awaken_buster", "name": "拆解重击",
    "description": "对单个敌人造成 220% 攻击的重击。",
    "activation": "active", "targeting": "enemy:first",
    "cooldown": 3, "priority": 1,
    "effects": [
      { "kind": "damage",
        "params": { "amount": { "kind": "attack", "multiplier": 2.2 } } }
    ]
  }
  ```

  lifesteal.json（被动，passive.triggers/effects 本就纯数据，照搬）：
  ```json
  {
    "id": "lifesteal", "name": "吸血", "description": "",
    "activation": "passive",
    "passive": {
      "triggers": [{ "timing": "attackAfter", "unitRef": "source" }],
      "effects": [{ "kind": "heal", "params": { "amount": { "kind": "flat", "value": 5 } } }]
    }
  }
  ```

- **A2 粒度与出口 = 每能力一文件 + loader 出口**：`combat/abilities/<abilityId>.json`（含 basic_attack.json），glob 域归并；`getAbilityConfig` 与 `BASIC_ATTACK` 导出迁至 `configs/loaders/combat.loader.ts`；state/abilityTypes.ts 头注「唯一配置源」同步更新指向。
- fireCount 字段为 EffectTemplate 可选项，json 直接携带（对齐 fireCount 挂起设计，内容开放时零改动）。

## 修订（用户复审·B1）

**description 数值漂移问题成立**：`"220%"` 与 `multiplier: 2.2` 是两份独立真相。拍板 **模板占位符插值**：

- json 存 `description` 模板，内含语义 token（`{attackPct}` / `{maxHpPct}` / `{flat}`，由主效果的公式种类映射）；
- loader 装配时从**同源 effects 参数**插值生成最终文案——数值唯一真相在 effects，永不漂移；
- 样例：`"description": "对单个敌人造成 {attackPct} 攻击的重击。"`；
- 无 token 的纯风味文本合法（原样输出）。
