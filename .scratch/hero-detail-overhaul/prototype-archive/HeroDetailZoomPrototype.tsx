// PROTOTYPE（英雄详情放大优化原型入口，非生产代码）：
// 三个放大规格变体通过 ?variant=A|B|C 切换（默认 B），浮动底栏 + 键盘 ← → 切换。
// 生产构建（NODE_ENV=production）不挂载（见 HeroTab 调用处）。
import React, { useState } from 'react';
import PrototypeSwitcher from './prototype/PrototypeSwitcher';
import { VariantA, VariantB, VariantC } from './heroDetailZoomVariants';

const VARIANTS = [
  { key: 'A', name: '温和放大 8.5-9.5px' },
  { key: 'B', name: '标准放大 10px' },
  { key: 'C', name: '激进放大 11px' },
];

const readVariant = (): string => {
  if (typeof window === 'undefined') return 'B';
  return new URLSearchParams(window.location.search).get('variant') ?? 'B';
};

const HeroDetailZoomPrototype: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [variant, setVariant] = useState<string>(readVariant());

  const changeVariant = (key: string) => {
    setVariant(key);
    const url = new URL(window.location.href);
    url.searchParams.set('variant', key);
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      {variant === 'A' && <VariantA onClose={onClose} />}
      {variant === 'B' && <VariantB onClose={onClose} />}
      {variant === 'C' && <VariantC onClose={onClose} />}
      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={changeVariant} />
    </>
  );
};

export default HeroDetailZoomPrototype;
