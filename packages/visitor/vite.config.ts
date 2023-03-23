import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: {
        visitor: resolve(__dirname, 'lib/visitor.ts'),
        server: resolve(__dirname, 'lib/server.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['http', 'process'],
    },
  },
});
