import { fileURLToPath, URL } from 'url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Everything the site talks to. Anything else is blocked by the browser.
const contentSecurityPolicy = [
  "default-src 'self'",
  // jsdelivr serves modules loaded from the console scripting API (requireModule)
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' data: blob: https://overpass-api.de https://*.overpass-api.de https://overpass.private.coffee " +
    'https://maps.mail.ru https://overpass.kumi.systems https://nominatim.openstreetmap.org ' +
    'https://d2uf7yjjctyxf.cloudfront.net https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function securityHeaders() {
  return {
    name: 'content-security-policy',
    apply: 'build', // the dev server needs inline HMR code and websockets
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}">\n    <meta name="referrer" content="strict-origin-when-cross-origin">`);
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), securityHeaders()],
  // Relative asset paths, so the site works from any GitHub Pages sub path.
  base: './',
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  server: {
    port: 8080
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
