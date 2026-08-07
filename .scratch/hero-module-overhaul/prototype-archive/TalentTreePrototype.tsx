// PROTOTYPE（天赋树 UI 原型入口，非生产代码）：
// 三个结构不同的天赋树变体，通过 ?variant=A|B|C 切换（默认 A），浮动底栏 + 键盘 ← → 切换。
// 生产构建（NODE_ENV=production）不挂载此组件（见 HeroDetailModal 调用处）。
import React, { useState } from 'react';
import PrototypeSwitcher from '../prototype/PrototypeSwitcher';
import { VariantA, VariantB, VariantC } from './variants';

const VARIANTS = [
  { key: 'A', name: '横向树' },
  { key: 'B', name: '技能网图' },
  { key: 'C', name: '缩进树' },
];

const readVariant = (): string => {
  if (typeof window === 'undefined') return 'A';
  return new URLSearchParams(window.location.search).get('variant') ?? 'A';
};

const TalentTreePrototype: React.FC<{ heroId: string }> = ({ heroId }) => {
  const [variant, setVariant] = useState<string>(readVariant());

  const changeVariant = (key: string) => {
    setVariant(key);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', key);
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      {variant === 'A' && <VariantA heroId={heroId} />}
      {variant === 'B' && <VariantB heroId={heroId} />}
      {variant === 'C' && <VariantC heroId={heroId} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={changeVariant} />
    </>
  );
};

export default TalentTreePrototype;
