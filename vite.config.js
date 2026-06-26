import path from 'path'
import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const srcDir = path.resolve(__dirname, 'src')
const uiDir = path.join(srcDir, 'components', 'ui')

/** Resolve @/components/ui/* with correct path so Vercel/Linux (case-sensitive) builds succeed */
function resolveUiExtensions() {
  let uiFiles = null
  function getUiFiles() {
    if (uiFiles) return uiFiles
    try {
      uiFiles = fs.readdirSync(uiDir)
    } catch {
      uiFiles = []
    }
    return uiFiles
  }
  function findUiFile(requestedName) {
    const requested = requestedName.toLowerCase().replace(/\.(jsx|tsx|js|ts)$/, '')
    const withExt = requested + '.jsx'
    for (const file of getUiFiles()) {
      if (file.toLowerCase() === withExt || file.toLowerCase() === requested) return path.join(uiDir, file)
    }
    return null
  }
  return {
    name: 'resolve-ui-extensions',
    resolveId(id) {
      const isUiImport = id.includes('components/ui/') || id.includes('components\\ui\\') || (path.isAbsolute(id) && id.replace(/\\/g, '/').startsWith(uiDir.replace(/\\/g, '/')))
      if (!isUiImport) return null
      const base = id.split(/[/\\]/).pop() || ''
      const resolved = findUiFile(base)
      if (resolved) return resolved
      const withJsx = path.join(uiDir, base.endsWith('.jsx') ? base : base + '.jsx')
      if (fs.existsSync(withJsx)) return withJsx
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [resolveUiExtensions(), react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
    extensions: ['.jsx', '.js', '.mjs', '.mts', '.ts', '.tsx', '.json'],
  },
})
