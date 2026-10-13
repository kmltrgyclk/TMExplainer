import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = 'src';
const UNICODE_MATHS = /[₀-₉⁰-⁹⁺⁻¬±Σ⊕≠∧]/;

function files(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return files(path);
		return /\.(svelte|ts)$/.test(name) ? [path] : [];
	});
}

function stripExpressions(text: string): string {
	let previous = '';
	while (previous !== text) {
		previous = text;
		text = text.replace(/\{[^{}]*\}/g, '');
	}
	return text;
}

function visibleText(source: string): string {
	const markup = source.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
	return stripExpressions(markup).replace(/<[^>]*>/g, ' ');
}

describe('maths notation', () => {
	const sources = files(ROOT);

	it('uses TeX instead of Unicode maths symbols in source', () => {
		const offenders = sources.flatMap((path) =>
			readFileSync(path, 'utf8')
				.split('\n')
				.map((line, i) => ({ path, line: i + 1, text: line }))
				.filter(({ text }) => UNICODE_MATHS.test(text) && !text.includes('aria-label') && !text.includes('title='))
				.filter(({ path, text }) => !(path.endsWith('machine.ts') && text.includes('¬')))
		);
		expect(offenders).toEqual([]);
	});

	it('keeps bare variables out of visible markup text', () => {
		const offenders = sources
			.filter((path) => path.endsWith('.svelte'))
			.flatMap((path) => {
				const text = visibleText(readFileSync(path, 'utf8'));
				return (text.match(/\b(x\d+|[Tspv] =)/g) ?? []).map((hit) => `${path}: ${hit}`);
			});
		expect(offenders).toEqual([]);
	});
});
