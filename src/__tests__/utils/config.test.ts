import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	getConfig,
	setConfigs,
	hasOwn,
	EDITORS_BY_PLATFORM,
} from '../../utils/config.js';
import { KnownError } from '../../utils/error.js';
import { mockConsole, createTempDir, cleanupTempDir } from '../helpers/setup.js';
import fs from 'fs/promises';
import os from 'os';
import ini from 'ini';

vi.mock('fs/promises');
vi.mock('child_process');

describe('config.ts', () => {
	let consoleMock: ReturnType<typeof mockConsole>;
	let tempDir: string;

	beforeEach(async () => {
		consoleMock = mockConsole();
		vi.clearAllMocks();

		// Setup temp directory
		tempDir = await createTempDir();
		vi.spyOn(os, 'homedir').mockReturnValue(tempDir);
	});

	afterEach(async () => {
		consoleMock.restore();
		await cleanupTempDir(tempDir);
		vi.spyOn(os, 'homedir').mockRestore();
	});

	describe('hasOwn', () => {
		it('should return true for own properties', () => {
			const obj = { foo: 'bar' };
			expect(hasOwn(obj, 'foo')).toBe(true);
		});

		it('should return false for non-existent properties', () => {
			const obj = { foo: 'bar' };
			expect(hasOwn(obj, 'baz')).toBe(false);
		});

		it('should return false for inherited properties', () => {
			const obj = Object.create({ inherited: 'value' });
			expect(hasOwn(obj, 'inherited')).toBe(false);
		});

		it('should work with null prototype objects', () => {
			const obj = Object.create(null);
			obj.foo = 'bar';
			expect(hasOwn(obj, 'foo')).toBe(true);
		});
	});

	describe('EDITORS_BY_PLATFORM', () => {
		it('should have editors for darwin', () => {
			expect(EDITORS_BY_PLATFORM.darwin).toBeDefined();
			expect(EDITORS_BY_PLATFORM.darwin).toContain('vi');
			expect(EDITORS_BY_PLATFORM.darwin).toContain('code');
		});

		it('should have editors for win32', () => {
			expect(EDITORS_BY_PLATFORM.win32).toBeDefined();
			expect(EDITORS_BY_PLATFORM.win32).toContain('notepad');
		});

		it('should have editors for linux', () => {
			expect(EDITORS_BY_PLATFORM.linux).toBeDefined();
			expect(EDITORS_BY_PLATFORM.linux).toContain('vi');
			expect(EDITORS_BY_PLATFORM.linux).toContain('nano');
		});
	});

	describe('getConfig', () => {
		it('should return default config when no config file exists', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig(undefined, true);

			expect(config.api_provider).toBe('openai');
			expect(config.locale).toBe('en');
			expect(config.timeout).toBe(10000);
		});

		it('should throw error for missing OpenAI key when provider is openai', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			await expect(
				getConfig({ api_provider: 'openai' }, false)
			).rejects.toThrow(KnownError);
		});

		it('should throw error for missing Anthropic key when provider is anthropic', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			await expect(
				getConfig({ api_provider: 'anthropic' }, false)
			).rejects.toThrow(KnownError);
		});

		it('should validate OpenAI key format', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(
				getConfig({ api_provider: 'openai', OPENAI_KEY: 'invalid' }, false)
			).rejects.toThrow(KnownError);
		});

		it('should validate Anthropic key format', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			await expect(
				getConfig(
					{ api_provider: 'anthropic', ANTHROPIC_API_KEY: 'invalid' },
					false
				)
			).rejects.toThrow(KnownError);
		});

		it('should accept valid OpenAI key', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig(
				{ api_provider: 'openai', OPENAI_KEY: 'sk-validkey123' },
				true
			);

			expect(config.OPENAI_KEY).toBe('sk-validkey123');
		});

		it('should accept valid locale', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ locale: 'en-US' }, true);

			expect(config.locale).toBe('en-US');
		});

		it('should reject invalid locale format', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			await expect(getConfig({ locale: '123' }, false)).rejects.toThrow(
				KnownError
			);
		});

		it('should use correct default model for openai', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ api_provider: 'openai' }, true);

			expect(config.model).toBe('gpt-4o');
		});

		it('should use correct default model for anthropic', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ api_provider: 'anthropic' }, true);

			expect(config.model).toBe('claude-sonnet-4-5-20250929');
		});

		it('should accept custom model', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ model: 'gpt-4-turbo' }, true);

			expect(config.model).toBe('gpt-4-turbo');
		});

		it('should validate timeout format', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			await expect(getConfig({ timeout: 'abc' }, false)).rejects.toThrow(
				KnownError
			);
		});

		it('should validate timeout minimum value', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(getConfig({ timeout: '100' }, false)).rejects.toThrow(
				KnownError
			);
		});

		it('should accept valid timeout', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ timeout: '5000' }, true);

			expect(config.timeout).toBe(5000);
		});

		it('should merge file config with cli config', async () => {
			const fileConfig = {
				api_provider: 'openai',
				locale: 'en',
			};

			vi.mocked(fs.lstat).mockResolvedValueOnce({} as any);
			vi.mocked(fs.readFile).mockResolvedValueOnce(ini.stringify(fileConfig));

			const config = await getConfig({ locale: 'fr' }, true);

			expect(config.locale).toBe('fr'); // CLI config overrides file config
		});

		it('should suppress errors when suppressErrors is true', async () => {
			vi.mocked(fs.lstat).mockRejectedValueOnce(new Error('File not found'));

			const config = await getConfig({ locale: 'invalid!!!' }, true);

			// Should not throw, but may have partial config
			expect(config).toBeDefined();
		});
	});

	describe('setConfigs', () => {
		it('should throw KnownError for invalid config key', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(setConfigs([['invalid_key', 'value']])).rejects.toThrow(
				KnownError
			);
		});

		it('should write valid config to file', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);

			await setConfigs([['locale', 'en-US']]);

			expect(fs.writeFile).toHaveBeenCalled();
		});

		it('should validate config values before writing', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(setConfigs([['timeout', 'invalid']])).rejects.toThrow(
				KnownError
			);
		});

		it('should handle multiple config updates', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);

			await setConfigs([
				['locale', 'en'],
				['timeout', '5000'],
			]);

			expect(fs.writeFile).toHaveBeenCalled();
		});

		it('should provide helpful error message for locale', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(setConfigs([['locale', '123']])).rejects.toThrow(
				'Must be a valid locale'
			);
		});

		it('should provide helpful error message for timeout', async () => {
			vi.mocked(fs.lstat).mockRejectedValue(new Error('File not found'));

			await expect(setConfigs([['timeout', '100']])).rejects.toThrow(
				'Timeout should be specified in milliseconds'
			);
		});
	});
});
