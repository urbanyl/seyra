import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sodiumCjs = fileURLToPath(new URL('./node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'libsodium-wrappers': sodiumCjs,
    },
  },
  optimizeDeps: {
    include: ['libsodium-wrappers'],
  },
  build: {
    outDir: '../server/public',
    emptyOutDir: true,
    target: 'es2020',
    // libsodium (≈ 700 Ko, chiffrement) est volontairement isolé et reste au-dessus de la limite par défaut.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // libsodium change rarement : son fichier reste en cache entre deux mises à jour de Seyra.
        manualChunks(id) {
          if (id.includes('libsodium')) return 'crypto';
          if (id.includes('node_modules/react') || id.includes('node_modules\\react')) return 'react';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true },
    },
  },
});
