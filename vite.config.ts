import { resolve } from 'path';

import swcReactPlugin from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

import config from './package.json';

export default defineConfig({
  plugins: [swcReactPlugin(), dts({ entryRoot: resolve(__dirname, 'src') })],
  assetsInclude: ['**/*.woff2'],
  build: {
    sourcemap: true,
    lib: {
      entry: [resolve(__dirname, 'src/index.ts')],
      name: 'serviceCreator',
      fileName: 'index',
    },
    rollupOptions: {
      external: [...Object.keys(config.dependencies)],
    },
  },
});
