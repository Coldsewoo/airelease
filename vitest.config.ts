import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'**/*.config.ts',
				'**/*.d.ts',
				'**/types/**',
				'src/cli.ts', // CLI entry point - better tested via E2E
				'src/command/**', // Command files - integration tested
				'src/utils/openai.ts', // API integrations - mock tested separately
				'src/utils/anthropic.ts', // API integrations - mock tested separately
				'src/__tests__/**', // Test files
			],
		},
		include: ['**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
		mockReset: true,
		restoreMocks: true,
		clearMocks: true,
	},
});
