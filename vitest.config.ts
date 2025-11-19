import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'tests/fixtures/',
        'tests/mocks/'
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'build/',
      '**/*.d.ts'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/scanning': resolve(__dirname, 'src/scanning'),
      '@/file-ops': resolve(__dirname, 'src/file-ops'),
      '@/ui': resolve(__dirname, 'src/ui'),
      '@/manual': resolve(__dirname, 'src/manual'),
      '@/core': resolve(__dirname, 'src/core')
    }
  },
  define: {
    'process.env.NODE_ENV': '"test"'
  }
});