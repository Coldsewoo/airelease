import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	assertGitRepo,
	assertCleanWorkingTree,
	getCommitMessagesFromPrevRelease,
	getDetectedCommits,
} from '../../utils/git.js';
import { KnownError } from '../../utils/error.js';
import { execa } from 'execa';

vi.mock('execa');

describe('git.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('assertGitRepo', () => {
		it('should return stdout when in a git repository', async () => {
			const mockPath = '/path/to/repo';
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockPath,
				failed: false,
			} as any);

			const result = await assertGitRepo();

			expect(result).toBe(mockPath);
			expect(execa).toHaveBeenCalledWith(
				'git',
				['rev-parse', '--show-toplevel'],
				{ reject: false }
			);
		});

		it('should throw KnownError when not in a git repository', async () => {
			// Mock first call for assertion
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: '',
				failed: true,
			} as any);

			await expect(assertGitRepo()).rejects.toThrow(KnownError);

			// Mock second call for message assertion
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: '',
				failed: true,
			} as any);

			await expect(assertGitRepo()).rejects.toThrow(
				'The current directory must be a Git repository!'
			);
		});
	});

	describe('assertCleanWorkingTree', () => {
		it('should not throw when working tree is clean', async () => {
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: '',
			} as any);

			await expect(assertCleanWorkingTree()).resolves.not.toThrow();
			expect(execa).toHaveBeenCalledWith('git', ['status', '--porcelain'], {
				reject: false,
			});
		});

		it('should throw KnownError when working tree has uncommitted changes', async () => {
			// Mock first call
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: 'M  file1.js\nA  file2.js',
			} as any);

			await expect(assertCleanWorkingTree()).rejects.toThrow(KnownError);

			// Mock second call for message assertion
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: 'M  file1.js\nA  file2.js',
			} as any);

			await expect(assertCleanWorkingTree()).rejects.toThrow(
				'The working directory has uncommitted changes'
			);
		});
	});

	describe('getCommitMessagesFromPrevRelease', () => {
		it('should get commits from previous tag to HEAD', async () => {
			const mockTag = 'v1.0.0';
			const mockCommits = 'abc123 feat: add feature\ndef456 fix: bug fix';

			// Mock git describe
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockTag,
			} as any);

			// Mock git log
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockCommits,
			} as any);

			const result = await getCommitMessagesFromPrevRelease();

			expect(result).toEqual({
				commits: ['feat: add feature', 'fix: bug fix'],
				message: mockCommits,
				previous_tag: mockTag,
			});

			expect(execa).toHaveBeenCalledWith('git', [
				'describe',
				'--tags',
				'--abbrev=0',
			]);
			expect(execa).toHaveBeenCalledWith('git', [
				'log',
				'--oneline',
				`${mockTag}..HEAD`,
			]);
		});

		it('should use provided target version', async () => {
			const targetVersion = 'v2.0.0';
			const mockCommits = 'abc123 feat: new feature';

			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockCommits,
			} as any);

			const result = await getCommitMessagesFromPrevRelease(targetVersion);

			expect(result?.previous_tag).toBe(targetVersion);
			expect(execa).toHaveBeenCalledWith('git', [
				'log',
				'--oneline',
				`${targetVersion}..HEAD`,
			]);
			// Should not call git describe when target version provided
			expect(execa).toHaveBeenCalledTimes(1);
		});

		it('should return undefined when no commits', async () => {
			const mockTag = 'v1.0.0';

			// Mock git describe
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockTag,
			} as any);

			// Mock git log with empty output
			vi.mocked(execa).mockResolvedValueOnce({
				stdout: '',
			} as any);

			const result = await getCommitMessagesFromPrevRelease();

			expect(result).toBeUndefined();
		});

		it('should properly strip commit hashes', async () => {
			const mockTag = 'v1.0.0';
			const mockCommits =
				'a1b2c3d feat: feature\n1234567 fix: bug\nabcdef0 docs: update';

			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockTag,
			} as any);

			vi.mocked(execa).mockResolvedValueOnce({
				stdout: mockCommits,
			} as any);

			const result = await getCommitMessagesFromPrevRelease();

			expect(result?.commits).toEqual([
				'feat: feature',
				'fix: bug',
				'docs: update',
			]);
		});
	});

	describe('getDetectedCommits', () => {
		it('should format single commit correctly', () => {
			const commits = ['feat: add new feature'];
			const previousTag = 'v1.0.0';

			const message = getDetectedCommits(commits, previousTag);

			expect(message).toBe(
				'Detected 1 commit from the previous release (v1.0.0) '
			);
		});

		it('should format multiple commits correctly', () => {
			const commits = ['feat: feature 1', 'fix: fix bug', 'docs: update docs'];
			const previousTag = 'v2.0.0';

			const message = getDetectedCommits(commits, previousTag);

			expect(message).toBe(
				'Detected 3 commits from the previous release (v2.0.0) '
			);
		});

		it('should use locale string for large numbers', () => {
			const commits = Array(1500).fill('commit');
			const previousTag = 'v3.0.0';

			const message = getDetectedCommits(commits, previousTag);

			expect(message).toContain('1,500');
			expect(message).toContain('commits');
		});

		it('should handle zero commits', () => {
			const commits: string[] = [];
			const previousTag = 'v1.0.0';

			const message = getDetectedCommits(commits, previousTag);

			// Zero commits should still say "commit" (singular) based on the implementation
			expect(message).toBe(
				'Detected 0 commit from the previous release (v1.0.0) '
			);
		});

		it('should include previous tag in message', () => {
			const commits = ['test'];
			const previousTag = 'release-1.2.3';

			const message = getDetectedCommits(commits, previousTag);

			expect(message).toContain('release-1.2.3');
		});
	});
});
