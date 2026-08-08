// 天赋树弹窗容器（03 号：从 HeroDetailModal 内联外提，统一走 UI_TOKENS + z-index 规范）
import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sliders } from 'lucide-react';
import { UI_TOKENS } from '../data/uiConstants';
import HeroTalentPanel from './HeroTalentPanel';

export interface HeroTalentModalProps {
  isOpen: boolean;
  heroId: string;
  heroName: string;
  onClose: () => void;
}

const HeroTalentModal: React.FC<HeroTalentModalProps> = ({ isOpen, heroId, heroName, onClose }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div onClick={onClose} className={UI_TOKENS.modalBackdropChild}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerScroll}
      >
        <header className={UI_TOKENS.modalHeader}>
          <h3 className={`${UI_TOKENS.modalHeaderTitle} text-amber-300`}>
            <Sliders className="w-4 h-4" /> 【{heroName}】天赋树
          </h3>
          <button onClick={onClose} className={UI_TOKENS.modalCloseButton}>
            <X className="w-4.5 h-4.5" />
          </button>
        </header>
        <HeroTalentPanel heroId={heroId} />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroTalentModal;
