import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'renderer', base: './', plugins: [react()], publicDir: '../assets/public', build: { outDir: '../dist/renderer', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 1200 } });
