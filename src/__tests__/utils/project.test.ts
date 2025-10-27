import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertArgv, assertSupportedProject, detectProjectType } from '../../utils/project.js';
import { KnownError } from '../../utils/error.js';
import { createFixture } from 'fs-fixture';

describe('project.ts', () => {
	describe('assertArgv', () => {
		it('should accept "major" as valid argument', () => {
			expect(() => assertArgv(['major'])).not.toThrow();
		});

		it('should accept "minor" as valid argument', () => {
			expect(() => assertArgv(['minor'])).not.toThrow();
		});

		it('should accept "patch" as valid argument', () => {
			expect(() => assertArgv(['patch'])).not.toThrow();
		});

		it('should accept "config" as valid argument', () => {
			expect(() => assertArgv(['config'])).not.toThrow();
		});

		it('should accept "help" as valid argument', () => {
			expect(() => assertArgv(['help'])).not.toThrow();
		});

		it('should throw KnownError for invalid argument', () => {
			expect(() => assertArgv(['invalid'])).toThrow(KnownError);
			expect(() => assertArgv(['invalid'])).toThrow(
				'No version argument was provided'
			);
		});

		it('should throw KnownError for empty array', () => {
			expect(() => assertArgv([])).toThrow(KnownError);
		});

		it('should throw KnownError for undefined first argument', () => {
			expect(() => assertArgv([undefined] as any)).toThrow(KnownError);
		});

		it('should throw KnownError for null first argument', () => {
			expect(() => assertArgv([null] as any)).toThrow(KnownError);
		});

		it('should only check first argument', () => {
			expect(() => assertArgv(['major', 'invalid', 'args'])).not.toThrow();
		});

		it('should be case-sensitive', () => {
			expect(() => assertArgv(['MAJOR'])).toThrow(KnownError);
			expect(() => assertArgv(['Major'])).toThrow(KnownError);
		});

		it('should not accept similar but invalid strings', () => {
			expect(() => assertArgv(['majors'])).toThrow(KnownError);
			expect(() => assertArgv(['patching'])).toThrow(KnownError);
			expect(() => assertArgv(['minors'])).toThrow(KnownError);
		});
	});

	describe('detectProjectType', () => {
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

		it('should detect npm project', async () => {
			fixture = await createFixture({
				'package.json': JSON.stringify({ name: 'test' }),
			});
			process.chdir(fixture.path);

			const type = await detectProjectType();
			expect(type).toBe('npm');
		});

		it('should detect Python project with setup.py', async () => {
			fixture = await createFixture({
				'setup.py': 'from setuptools import setup',
			});
			process.chdir(fixture.path);

			const type = await detectProjectType();
			expect(type).toBe('python');
		});

		it('should detect Python project with pyproject.toml', async () => {
			fixture = await createFixture({
				'pyproject.toml': '[project]\nversion = "1.0.0"',
			});
			process.chdir(fixture.path);

			const type = await detectProjectType();
			expect(type).toBe('python');
		});

		it('should throw for Rust project', async () => {
			fixture = await createFixture({
				'Cargo.toml': '[package]',
			});
			process.chdir(fixture.path);

			await expect(detectProjectType()).rejects.toThrow(KnownError);
			await expect(detectProjectType()).rejects.toThrow('Rust project detected');
		});

		it('should throw for Go project', async () => {
			fixture = await createFixture({
				'go.mod': 'module test',
			});
			process.chdir(fixture.path);

			await expect(detectProjectType()).rejects.toThrow(KnownError);
			await expect(detectProjectType()).rejects.toThrow('Go project detected');
		});

		it('should return unsupported for unrecognized project', async () => {
			fixture = await createFixture({
				'README.md': '# Test',
			});
			process.chdir(fixture.path);

			const type = await detectProjectType();
			expect(type).toBe('unsupported');
		});
	});

	describe('assertSupportedProject', () => {
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

		it('should not throw for npm project', async () => {
			fixture = await createFixture({
				'package.json': JSON.stringify({ name: 'test' }),
			});
			process.chdir(fixture.path);

			const type = await assertSupportedProject();
			expect(type).toBe('npm');
		});

		it('should not throw for Python project', async () => {
			fixture = await createFixture({
				'setup.py': 'from setuptools import setup\n\nsetup(version="1.0.0")',
			});
			process.chdir(fixture.path);

			const type = await assertSupportedProject();
			expect(type).toBe('python');
		});

		it('should throw for unsupported project', async () => {
			fixture = await createFixture({
				'README.md': '# Test',
			});
			process.chdir(fixture.path);

			await expect(assertSupportedProject()).rejects.toThrow(KnownError);
			await expect(assertSupportedProject()).rejects.toThrow('No supported project');
		});
	});
});
