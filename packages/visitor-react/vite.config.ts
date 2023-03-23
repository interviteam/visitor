import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/visitor-react.ts'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        '@interactivevision/visitor',
        'react',
        'react-dom',
      ],
    },
  },
});
