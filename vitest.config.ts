import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/types.ts',
            ],
            thresholds: {
                lines: 45,
                functions: 25,
                branches: 65,
                statements: 45,
            },
        },
    },
    resolve: {
        alias: {
            '@': './src',
        },
    },
});
