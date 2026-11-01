/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: './', build: { outDir: '../public/avatar', emptyOutDir: true }, plugins: [react()], test: { environment: 'node' } });
