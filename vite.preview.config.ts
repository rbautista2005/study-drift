import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

// Lightweight local preview used when the Cloudflare/Sites emulator is unavailable.
// Production builds continue to use vite.config.ts and its full hosting metadata.
export default defineConfig({
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: {
    noDiscovery: true,
    include: ['react', 'react-dom', 'lucide-react'],
  },
  plugins: [vinext()],
});
