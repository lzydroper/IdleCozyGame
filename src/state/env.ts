// 环境工具：测试环境检测
export const isTestEnv = (): boolean => {
  return typeof globalThis !== 'undefined' &&
    ((globalThis as any).process?.env?.NODE_ENV === 'test' ||
      !!(globalThis as any).process?.env?.VITEST);
};
