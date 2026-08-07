/**
 * 统一 UI 弹窗与布局 Design Tokens
 * 消除散落各处的硬编码尺寸与样式，统一管理宽度、高度、z-index、背景透明度与高斯模糊度。
 */
export const UI_TOKENS = {
  // 蒙版 Backdrop（05 号：移除 backdrop-blur——17 号结论「全屏 blur 是滚动合成压力主因」，
  // 此前只清理了自绘 backdrop，统一 token 路径遗漏；保留 bg-black/75-80 透明度维持视觉层次）
  modalBackdrop: 'fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',
  modalBackdropSub: 'fixed inset-0 z-[10002] bg-black/80 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',

  // 标准固定尺寸弹窗容器 (HeroDetailModal, HeroListModal, PartySlotModal)
  modalContainerStandard: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden',

  // 装备详情专用弹窗容器 (EquipmentDetailModal)；overscroll-contain（05 号）隔离滚动链
  modalContainerEquipment: 'bg-zinc-900 border-2 border-amber-600/40 rounded-2xl w-[92%] max-w-[370px] max-h-[85vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto overscroll-contain',

  // 紧凑选择器弹窗容器 (EquipSelectorModal)
  modalContainerCompact: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[360px] max-h-[75vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden',
};
