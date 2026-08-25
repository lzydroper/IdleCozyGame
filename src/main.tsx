import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { GameProvider } from './context/GameContext'
import { ToastProvider } from './components/ToastSystem'

const root = createRoot(document.getElementById('root')!)

/**
 * 双入口：dev 模式下访问 /#editor 打开配置内容工作台（动态 import，生产构建整分支剔除）；
 * 其余情况进入游戏本体。
 */
const boot = async (): Promise<void> => {
  if (import.meta.env.DEV && window.location.hash === '#editor') {
    const { ContentEditorApp } = await import('./dev/contentEditor/ContentEditorApp')
    root.render(
      <StrictMode>
        <ContentEditorApp />
      </StrictMode>,
    )
    return
  }
  root.render(
    <StrictMode>
      <GameProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </GameProvider>
    </StrictMode>,
  )
}

void boot()
