import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
