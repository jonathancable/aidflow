import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@':              path.resolve(__dirname, 'src'),
      '@features':      path.resolve(__dirname, 'src/features'),
      '@components':    path.resolve(__dirname, 'src/components'),
      '@hooks':         path.resolve(__dirname, 'src/hooks'),
      '@stores':        path.resolve(__dirname, 'src/stores'),
      '@pages':         path.resolve(__dirname, 'src/pages'),
      '@lib':           path.resolve(__dirname, 'src/lib'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});