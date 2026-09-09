/** 目录表 React 上下文（plain ts，避免组件文件混合导出） */
import { createContext, useContext } from 'react';
import type { Catalogs } from '../types';

export const CatalogContext = createContext<{ catalogs: Catalogs }>({ catalogs: {} });
export const CatalogProvider = CatalogContext.Provider;
export const useCatalogs = (): Catalogs => useContext(CatalogContext).catalogs;
