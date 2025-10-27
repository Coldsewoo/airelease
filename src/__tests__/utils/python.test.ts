import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCurrentPythonVersion } from '../../utils/python.js';
import { createFixture } from 'fs-fixture';

describe('python.ts', () => {
	describe('getCurrentPythonVersion', () => {
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

		it('should read version from pyproject.toml', async () => {
			fixture = await createFixture({
				'pyproject.toml': '[project]\nversion = "1.2.3"',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('1.2.3');
		});

		it('should read version from __init__.py in root', async () => {
			fixture = await createFixture({
				'__init__.py': '__version__ = "2.0.0"',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('2.0.0');
		});

		it('should read version from __init__.py in src/', async () => {
			fixture = await createFixture({
				'src': {
					'__init__.py': '__version__ = "3.1.4"',
				},
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('3.1.4');
		});

		it('should read version from setup.py', async () => {
			fixture = await createFixture({
				'setup.py': 'from setuptools import setup\n\nsetup(version="1.0.5")',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('1.0.5');
		});

		it('should read version from setup.cfg', async () => {
			fixture = await createFixture({
				'setup.cfg': '[metadata]\nversion = 0.9.1',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('0.9.1');
		});

		it('should prioritize pyproject.toml over __init__.py', async () => {
			fixture = await createFixture({
				'pyproject.toml': '[project]\nversion = "5.0.0"',
				'__init__.py': '__version__ = "1.0.0"',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('5.0.0');
		});

		it('should prioritize root __init__.py over src/__init__.py', async () => {
			fixture = await createFixture({
				'__init__.py': '__version__ = "2.0.0"',
				'src': {
					'__init__.py': '__version__ = "1.0.0"',
				},
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('2.0.0');
		});

		it('should prioritize __init__.py over setup.py', async () => {
			fixture = await createFixture({
				'__init__.py': '__version__ = "3.0.0"',
				'setup.py': 'from setuptools import setup\n\nsetup(version="1.0.0")',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('3.0.0');
		});

		it('should handle __version__ with single quotes', async () => {
			fixture = await createFixture({
				'__init__.py': "__version__ = '4.5.6'",
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('4.5.6');
		});

		it('should handle __version__ with spaces', async () => {
			fixture = await createFixture({
				'__init__.py': '__version__   =   "1.2.3"',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBe('1.2.3');
		});

		it('should return null when no version found', async () => {
			fixture = await createFixture({
				'README.md': '# Test',
			});
			process.chdir(fixture.path);

			const version = await getCurrentPythonVersion();
			expect(version).toBeNull();
		});
	});
});
