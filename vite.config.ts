import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

/**
 * 配置编辑器保存通道（仅 dev serve）：
 * POST /__content_editor/save  body: { path: 'src/data/xxx.json', content: '<json 文本>' }
 * 校验路径必须落在 src/data 下且为 .json、内容可解析后写回源文件；生产构建不受影响。
 */
const contentEditorServer = (): Plugin => ({
  name: 'content-editor-save',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__content_editor/save', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'POST only' }))
        return
      }
      let body = ''
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf8')
        if (body.length > 8_000_000) req.destroy(new Error('payload too large'))
      })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body) as { path?: unknown; content?: unknown }
          const rel = typeof parsed.path === 'string' ? parsed.path : ''
          const content = typeof parsed.content === 'string' ? parsed.content : ''
          if (!/^src\/data\/[A-Za-z0-9_\-./]+\.json$/.test(rel) || rel.includes('..')) {
            throw new Error(`非法路径：${rel}（只允许 src/data/*.json）`)
          }
          JSON.parse(content) // 内容必须是合法 JSON
          const abs = path.join(path.dirname(fileURLToPath(import.meta.url)), rel)
          fs.mkdirSync(path.dirname(abs), { recursive: true }) // 新区域等会创建新文件夹
          fs.writeFileSync(abs, content.endsWith('\n') ? content : `${content}\n`, 'utf8')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }))
        }
      })
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [contentEditorServer(), react(), tailwindcss()],
  server: {
    allowedHosts: ['.ngrok-free.dev']
  }
})
