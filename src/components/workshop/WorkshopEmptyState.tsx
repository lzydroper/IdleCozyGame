import React from 'react';

// 工坊空状态（ticket 02 拆分；ticket 03 分类栏引入后按分类显示空态文案）
const WorkshopEmptyState: React.FC = () => (
  <p className="py-6 text-center text-xs text-zinc-600 italic">工坊暂无可用配方</p>
);

export default WorkshopEmptyState;
