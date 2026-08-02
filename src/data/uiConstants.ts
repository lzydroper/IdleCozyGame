/**
 * 统一 UI 弹窗与布局 Design Tokens
 * 消除散落各处的硬编码尺寸与样式，统一管理宽度、高度、z-index、背景透明度与高斯模糊度。
 */
export const UI_TOKENS = {
  // 蒙版 Backdrop
  modalBackdrop: 'fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',
  modalBackdropSub: 'fixed inset-0 z-[10002] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',

  // 标准固定尺寸弹窗容器 (HeroDetailModal, HeroListModal, PartySlotModal)
  modalContainerStandard: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden',

  // 装备详情专用弹窗容器 (EquipmentDetailModal)
  modalContainerEquipment: 'bg-zinc-900 border-2 border-amber-600/40 rounded-2xl w-[92%] max-w-[370px] max-h-[85vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto',

  // 紧凑选择器弹窗容器 (EquipSelectorModal)
  modalContainerCompact: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[360px] max-h-[75vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden',
};
