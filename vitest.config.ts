import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], test: { env: { APP_MODE: 'test' }, include: ['tests/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'], testTimeout: 60000, hookTimeout: 600000, fileParallelism: false } });

