import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Strip type="module" and crossorigin so the build works on file:// */
/** Also wrap JS bundle in IIFE to avoid top-level export syntax errors */
function fileProtocolPlugin(): Plugin {
  return {
    name: 'file-protocol-compat',
    enforce: 'post',
    transformIndexHtml(html) {
      // Extract script tags, strip module/crossorigin attrs, move to end of body
      let scriptTags: string[] = []
      let result = html.replace(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>\s*/g, (match) => {
        scriptTags.push(
          match.replace(/ type="module"/g, '').replace(/ crossorigin/g, '')
        )
        return ''
      })
      // Strip crossorigin from CSS links too (fails on file://)
      result = result.replace(/ crossorigin/g, '')
      // Insert scripts right before </body>
      result = result.replace('</body>', scriptTags.join('\n') + '\n</body>')
      return result
    },
    generateBundle(_options, bundle) {
      for (const [, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) {
          // Strip ESM syntax invalid in classic scripts and wrap in IIFE
          let stripped = chunk.code.replace(/export\{[^}]*\};?/g, '')
          // Replace import.meta.url with a file:// compatible fallback
          stripped = stripped.replace(/import\.meta\.url/g, 'undefined')
          chunk.code = `(function(){\n${stripped}\n})();`
        }
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), fileProtocolPlugin()],
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
  build: {
    modulePreload: false,
    target: 'es2023',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
