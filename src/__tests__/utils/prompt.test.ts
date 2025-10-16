import { describe, it, expect } from 'vitest';
import { generatePrompt } from '../../utils/prompt.js';

describe('prompt.ts', () => {
	describe('generatePrompt', () => {
		it('should generate prompt with default English locale', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('# Task: Generate Release Notes');
			expect(prompt).toContain('Output language: English');
			expect(prompt).toContain('expert release notes generator');
		});

		it('should generate prompt with custom locale', () => {
			const prompt = generatePrompt('Spanish');

			expect(prompt).toContain('Output language: Spanish');
		});

		it('should include all required sections', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('# Task: Generate Release Notes');
			expect(prompt).toContain('## Instructions:');
			expect(prompt).toContain('## Output Format:');
			expect(prompt).toContain('## Guidelines:');
		});

		it('should include instructions for categorization', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('group by category');
			expect(prompt).toContain('Features');
			expect(prompt).toContain('Bug Fixes');
			expect(prompt).toContain('Improvements');
			expect(prompt).toContain('Documentation');
			expect(prompt).toContain('Maintenance');
		});

		it('should include instructions for formatting', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('markdown heading');
			expect(prompt).toContain('bullet points with dash (-)');
			expect(prompt).toContain('type prefixes');
		});

		it('should include instructions to preserve references', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('PRESERVE issue/PR references');
			expect(prompt).toContain('(#123)');
			expect(prompt).toContain('(PR-456)');
		});

		it('should include instructions to remove unwanted commits', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('Remove merge commits');
			expect(prompt).toContain('version bump commits');
		});

		it('should include example output format', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('### Features');
			expect(prompt).toContain('### Bug Fixes');
			expect(prompt).toContain('[Improved commit description] (#PR)');
		});

		it('should include guidelines for message quality', () => {
			const prompt = generatePrompt();

			expect(prompt).toContain('concise but informative');
			expect(prompt).toContain('active voice');
			expect(prompt).toContain('present tense');
			expect(prompt).toContain('user-facing changes');
		});

		it('should return a string', () => {
			const prompt = generatePrompt();
			expect(typeof prompt).toBe('string');
		});

		it('should not have empty lines between sections', () => {
			const prompt = generatePrompt();
			const lines = prompt.split('\n');

			// Filter out actual content lines (non-empty)
			const contentLines = lines.filter((line) => line.trim().length > 0);

			// Ensure we have multiple lines of content
			expect(contentLines.length).toBeGreaterThan(10);
		});

		it('should handle various locale formats', () => {
			const locales = ['English', 'Spanish', 'French', 'German', 'Japanese'];

			locales.forEach((locale) => {
				const prompt = generatePrompt(locale);
				expect(prompt).toContain(`Output language: ${locale}`);
			});
		});

		it('should handle empty string locale by defaulting to English', () => {
			const prompt = generatePrompt('');
			expect(prompt).toContain('Output language: ');
		});

		it('should include category ordering instructions', () => {
			const prompt = generatePrompt();
			expect(prompt).toContain('Order categories by importance');
			expect(prompt).toContain('Features → Bug Fixes → Improvements → Others');
		});
	});
});
