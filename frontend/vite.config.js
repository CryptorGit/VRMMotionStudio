import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Dev-only endpoint to print logs to the frontend terminal
function devLogPlugin() {
  return {
    name: 'dev-log-endpoint',
    configureServer(server) {
      const logDir = path.resolve(process.cwd(), '.logs')
      const logFile = path.join(logDir, 'dev.log')
      // Truncate the log at dev server start so each run starts fresh
      try {
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
        fs.writeFileSync(logFile, '', 'utf8')
      } catch {}
      function append(line) {
        try {
          if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
          // rotate if file > 5MB
          try {
            const stat = fs.existsSync(logFile) ? fs.statSync(logFile) : null
            if (stat && stat.size > 5 * 1024 * 1024) {
              const bak = logFile + '.1'
              if (fs.existsSync(bak)) fs.rmSync(bak)
              fs.renameSync(logFile, bak)
            }
          } catch {}
          fs.appendFileSync(logFile, line + '\n', 'utf8')
        } catch {}
      }
      server.middlewares.use('/__dev__/log/clear', (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
          fs.writeFileSync(logFile, '', 'utf8')
        } catch {}
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true }))
      })
      server.middlewares.use('/__dev__/log', (req, res, next) => {
        if (req.method !== 'POST') return next()
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          try {
            const data = body ? JSON.parse(body) : {}
            // eslint-disable-next-line no-console

            append(JSON.stringify({ ts: Date.now(), ...data }))
          } catch (e) {
            // eslint-disable-next-line no-console

            append(JSON.stringify({ ts: Date.now(), raw: body }))
          }
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        })
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [devLogPlugin(), vue()],
  assetsInclude: ['**/*.vrm'],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8081'
    }
  }
})

