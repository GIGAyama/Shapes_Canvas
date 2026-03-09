import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // 大きめの値を設定してインライン化を強制
    chunkSizeWarningLimit: 100000,
    reportCompressedSize: false,
  },
});
