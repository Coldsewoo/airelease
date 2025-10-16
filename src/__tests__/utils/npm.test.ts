import { describe, it, expect } from 'vitest';
import { assertArgv } from '../../utils/npm.js';
import { KnownError } from '../../utils/error.js';

describe('npm.ts', () => {
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
});
