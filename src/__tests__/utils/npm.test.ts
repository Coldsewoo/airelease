import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentNpmVersion } from '../../utils/npm.js';
import { createFixture } from 'fs-fixture';

describe('npm.ts', () => {
	describe('getCurrentNpmVersion', () => {
		let fixture: Awaited<ReturnType<typeof createFixture>>;
		let originalCwd: string;

		beforeEach(() => {
			originalCwd = process.cwd();
		});

		afterEach(async () => {
			process.chdir(originalCwd);
			if (fixture) {
				await fixture.rm();
			}
		});

		it('should read version from npm package.json', async () => {
			fixture = await createFixture({
				'package.json': JSON.stringify({ version: '1.0.0' }),
			});
			process.chdir(fixture.path);

			const version = await getCurrentNpmVersion();
			expect(version).toBe('1.0.0');
		});

		it('should read version from package.json with other fields', async () => {
			fixture = await createFixture({
				'package.json': JSON.stringify({
					name: 'test-package',
					version: '2.3.4',
					description: 'Test package',
				}),
			});
			process.chdir(fixture.path);

			const version = await getCurrentNpmVersion();
			expect(version).toBe('2.3.4');
		});

		it('should return null when package.json has no version', async () => {
			fixture = await createFixture({
				'package.json': JSON.stringify({ name: 'test' }),
			});
			process.chdir(fixture.path);

			const version = await getCurrentNpmVersion();
			expect(version).toBeNull();
		});

		it('should return null when package.json does not exist', async () => {
			fixture = await createFixture({
				'README.md': '# Test',
			});
			process.chdir(fixture.path);

			const version = await getCurrentNpmVersion();
			expect(version).toBeNull();
		});
	});
});
