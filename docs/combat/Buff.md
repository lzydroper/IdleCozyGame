# 概述

buff理论上是玩家可见层面以及配置层面的东西，其底层最终实现是通过效果来生效的；

buff的持续时间Duration理论上分为三种类型，但实际上第一种应直接用效果实现，跳过buff：

1. 瞬间instant，立即触发效果，不进行任何注册，实际直接用效果实现，跳过buff
2. 永久forever，不会因为回合结束减少持续时间
3. 暂时temporary，持续一定数量的回合数，每次触发结算完后，减少持续回合数，任何时候归零时移除buff和其所属的效果；对一次触发多次效果的，应表现为一次触发结算，触发一次效果，但是对应注册的效果触发次数增加，在时机管理中对应效果被触发时，计算多次，而非结算多次

buff拥有触发时机，这是一个数组，可以指定某些单位的某些时机（轮次主时机或细粒度事件，见 Turn.md 时机分类学），并注册相关所有效果到对应时机中，效果拥有是否可触发接口，时机传入当前回合归属来得到结果

buff的刷新策略Renew为true or false，当重复获得同一种buff时使用，若为true，则刷新原来的buff持续时间为传入值，若为false则无效果

buff的堆叠策略Stack为true or false，当重复获得同一种buff时使用，若为true，则增加原来的buff的堆叠层数，若为false则无效果

不允许存在同种buff的多个实例挂载在同一个单位上，即便数值有区别也不处理，具体为挂载buff时尝试根据buffid获取实例，然后根据buff的两个策略仅更新持续时间和堆叠层数，buff的实例化不会改变配置层的Duration、Renew、Stack三个策略

buff实例的数值不由自己计算（即不会有除了配置层外，额外的根据谁的属性计算什么什么之类的），而是在创建buff实例时传入，具体造成的数值也是由buff创建的Effect根据目标的属性来计算，buff不负责计算数值，只记录来源，目标，传入的数值等等

以下为一些可能的buff配置

```markdown
- 灼烧
	- Duration: temporary(5)
	- Trigger: 目标的回合开始前
	- Renew: true
	- Stack: true, 1
	- Description: 对目标每回合造成{30 * 层数}点{火焰}伤害，持续{5}回合，可刷新
	- 备注：这里的5、1、30可能因为属性发生变化，但是在buff创建时就会传入
- 眩晕
	- Duration: temporary(1)
	- Trigger: 目标的回合开始前
	- Renew: true
	- Stack: false
	- Description: 令目标眩晕{1}回合
					- 眩晕：跳过当前回合（持续 N=duration 即严格跳过 N 个自身回合；行动资格在目标回合开始时快照判定，之后才递减时长）
    - 备注：这里的1可能在施加时因目标意志属性过高被 durationReduction 减免到 0，眩晕直接不生效（中断码 zeroed，区别于免疫的 negated），目标回合不跳过
- 折焰
	- Duration: forever
	- Trigger: 目标攻击后
	- Renew: false
	- Stack: true, 5
	- Decription: 令目标下{stack}次攻击附加{5}点火焰伤害，
	- 备注：持续时间一定是语义上的回合数，不能在这里使用Duration: temporary(5)来混淆用法
- 战意
	- Duration: forever
	- Trigger: 目标的回合开始前
	- Renew: false
	- Stack: false
	- Description: 回合开始前，根据存活敌人数n，重新获得{1.5 * n}点力量
	- 备注：注意是重新，也就是每次获得力量前，会先清除对应的Modifier，再计算，再获得
- 春和
	- Duration: forever
	- Trigger: 受到“治疗”效果时
	- Renew: false
	- Stack: false
	- Description: 受到的治疗效果提升{10%}
	- 备注：该buff的生效需要效果有可识别字段，并使用统一 Modifier（`target: 'effect.heal'`）修正治疗数值
```

