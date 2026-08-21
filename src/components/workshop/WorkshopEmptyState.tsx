import React from 'react';

// 工坊空状态（ticket 02/03）：传入当前分类标签显示「{label}分类暂无配方」
const WorkshopEmptyState: React.FC<{ label?: string }> = ({ label }) => (
  <p className="py-6 text-center text-xs text-zinc-600 italic">
    {label ? `${label}分类暂无配方` : '工坊暂无可用配方'}
  </p>
);

export default WorkshopEmptyState;
