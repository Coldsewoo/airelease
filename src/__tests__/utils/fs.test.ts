import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileExists } from '../../utils/fs.js';
import { createTempDir, cleanupTempDir } from '../helpers/setup.js';
import fs from 'fs/promises';
import path from 'path';

describe('fs.ts', () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await createTempDir();
	});

	afterEach(async () => {
		await cleanupTempDir(tempDir);
	});

	describe('fileExists', () => {
		it('should return true for existing file', async () => {
			const filePath = path.join(tempDir, 'test.txt');
			await fs.writeFile(filePath, 'test content');

			const exists = await fileExists(filePath);
			expect(exists).toBe(true);
		});

		it('should return false for non-existing file', async () => {
			const filePath = path.join(tempDir, 'nonexistent.txt');

			const exists = await fileExists(filePath);
			expect(exists).toBe(false);
		});

		it('should return true for existing directory', async () => {
			const dirPath = path.join(tempDir, 'subdir');
			await fs.mkdir(dirPath);

			const exists = await fileExists(dirPath);
			expect(exists).toBe(true);
		});

		it('should return true for symbolic link', async () => {
			const filePath = path.join(tempDir, 'original.txt');
			const linkPath = path.join(tempDir, 'link.txt');

			await fs.writeFile(filePath, 'content');
			await fs.symlink(filePath, linkPath);

			const exists = await fileExists(linkPath);
			expect(exists).toBe(true);
		});

		it('should return true for broken symbolic link', async () => {
			const linkPath = path.join(tempDir, 'broken-link.txt');
			const nonExistentTarget = path.join(tempDir, 'nonexistent.txt');

			await fs.symlink(nonExistentTarget, linkPath);

			// lstat should find the symlink itself even if target doesn't exist
			const exists = await fileExists(linkPath);
			expect(exists).toBe(true);
		});

		it('should handle invalid paths gracefully', async () => {
			const exists = await fileExists('/invalid/path/that/does/not/exist');
			expect(exists).toBe(false);
		});
	});
});
