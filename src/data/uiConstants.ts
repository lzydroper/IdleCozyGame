/**
 * 统一 UI 弹窗与布局 Design Tokens
 * 消除散落各处的硬编码尺寸与样式，统一管理宽度、高度、z-index、背景透明度与高斯模糊度。
 */
export const UI_TOKENS = {
  // 蒙版 Backdrop（05 号：移除 backdrop-blur——17 号结论「全屏 blur 是滚动合成压力主因」，
  // 此前只清理了自绘 backdrop，统一 token 路径遗漏；保留 bg-black/75-80 透明度维持视觉层次）
  // z-index 规范（03 号）：主弹窗 10000 / 子弹窗 10001 / 三级 10002
  modalBackdrop: 'fixed inset-0 z-[10000] bg-black/75 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',
  modalBackdropChild: 'fixed inset-0 z-[10001] bg-black/75 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',
  modalBackdropSub: 'fixed inset-0 z-[10002] bg-black/80 flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto',

  // 标准固定尺寸弹窗容器（03 号：统一到 w-[92%] max-w-[380px] max-h-[68vh]）
  modalContainerStandard: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-hidden',

  // 装备详情专用弹窗容器 (EquipmentDetailModal)；overscroll-contain（05 号）隔离滚动链，保留滚动
  modalContainerEquipment: 'bg-zinc-900 border-2 border-amber-600/40 rounded-2xl w-[92%] max-w-[380px] max-h-[68vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto overscroll-contain',

  // 紧凑选择器弹窗容器 (EquipSelectorModal)
  modalContainerCompact: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[68vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden',

  // 可滚动长内容弹窗容器 (HeroDossierModal、天赋树等)；尺寸统一 + 保留滚动（03 号）
  modalContainerScroll: 'bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[68vh] p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto overscroll-contain',

  // 字号阶梯（03 号，基于 02 变体 C 规格；textBodyDense 用于高密度属性表）
  textBody: 'text-[11px]',
  textBodyDense: 'text-[10px]',
  textLabel: 'text-[10px]',
  textMini: 'text-[9px]',

  // 区段卡（弹窗内信息分区）
  sectionCard: 'bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2',

  // 弹窗头部（03 号统一）
  modalHeader: 'flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0',
  modalHeaderTitle: 'text-sm font-black text-zinc-100 flex items-center gap-1.5',
  modalCloseButton: 'p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0',
};
