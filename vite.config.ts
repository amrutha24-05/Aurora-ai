import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd()),
      },
    },
    server: {
      // HMR is disabled in AI Studio to prevent WebSocket collision and UI flickering.
      hmr: false,
      watch: null,
    },
  };
});
