import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@dal': path.resolve(__dirname, 'src/dal'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@routes': path.resolve(__dirname, 'src/routes'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@types': path.resolve(__dirname, 'src/types'),
    },
  },
});
