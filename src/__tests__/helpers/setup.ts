import { vi } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/**
 * Mock process.platform for testing platform-specific behavior
 */
export const mockPlatform = (platform: NodeJS.Platform) => {
	Object.defineProperty(process, 'platform', {
		value: platform,
		configurable: true,
	});
};

/**
 * Create a temporary directory for testing
 */
export const createTempDir = async (): Promise<string> => {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'airelease-test-'));
	return tmpDir;
};

/**
 * Clean up temporary directory
 */
export const cleanupTempDir = async (dirPath: string) => {
	try {
		await fs.rm(dirPath, { recursive: true, force: true });
	} catch {
		// Ignore cleanup errors
	}
};

/**
 * Mock console methods
 */
export const mockConsole = () => {
	const originalConsole = {
		log: console.log,
		error: console.error,
		warn: console.warn,
	};

	const mocks = {
		log: vi.spyOn(console, 'log').mockImplementation(() => {}),
		error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
	};

	return {
		mocks,
		restore: () => {
			console.log = originalConsole.log;
			console.error = originalConsole.error;
			console.warn = originalConsole.warn;
		},
	};
};
