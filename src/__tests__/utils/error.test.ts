import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnownError, handleCliError } from '../../utils/error.js';
import { mockConsole } from '../helpers/setup.js';

describe('error.ts', () => {
	describe('KnownError', () => {
		it('should be an instance of Error', () => {
			const error = new KnownError('Test error');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(KnownError);
		});

		it('should have the correct message', () => {
			const message = 'This is a known error';
			const error = new KnownError(message);
			expect(error.message).toBe(message);
		});

		it('should have a name property', () => {
			const error = new KnownError('Test');
			expect(error.name).toBe('Error');
		});
	});

	describe('handleCliError', () => {
		let consoleMock: ReturnType<typeof mockConsole>;

		beforeEach(() => {
			consoleMock = mockConsole();
		});

		afterEach(() => {
			consoleMock.restore();
		});

		it('should not log anything for KnownError', () => {
			const error = new KnownError('This is a known error');
			handleCliError(error);

			expect(consoleMock.mocks.error).not.toHaveBeenCalled();
		});

		it('should log stack trace for unknown Error', () => {
			const error = new Error('Unexpected error');
			error.stack = 'Error: Unexpected error\n  at line1\n  at line2';

			handleCliError(error);

			expect(consoleMock.mocks.error).toHaveBeenCalled();
			const calls = consoleMock.mocks.error.mock.calls;

			// Should log stack trace (excluding first line)
			expect(calls[0][0]).toContain('at line1');

			// Should log version info
			expect(calls[1][0]).toContain('airelease v');

			// Should log bug report message
			expect(calls[2][0]).toContain('Please open a Bug report');

			// Should log GitHub URL
			expect(calls[3][0]).toContain('github.com/Coldsewoo/airelease');
		});

		it('should handle Error without stack trace', () => {
			const error = new Error('Error without stack');
			delete error.stack;

			handleCliError(error);

			expect(consoleMock.mocks.error).toHaveBeenCalled();
			const calls = consoleMock.mocks.error.mock.calls;

			// Should still log version and bug report info
			expect(calls[0][0]).toContain('airelease v');
			expect(calls[1][0]).toContain('Please open a Bug report');
		});

		it('should handle non-Error objects', () => {
			const error = { message: 'Not an Error object' };

			handleCliError(error);

			expect(consoleMock.mocks.error).not.toHaveBeenCalled();
		});

		it('should handle null and undefined', () => {
			handleCliError(null);
			handleCliError(undefined);

			expect(consoleMock.mocks.error).not.toHaveBeenCalled();
		});
	});
});
