import katex from 'katex';

const cache = new Map<string, string>();

export function tex(expression: string, display = false): string {
	const key = `${display ? 'D' : 'I'}${expression}`;
	let html = cache.get(key);
	if (html === undefined) {
		html = katex.renderToString(expression, { displayMode: display, throwOnError: false });
		cache.set(key, html);
	}
	return html;
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function rich(text: string): string {
	return text
		.split(/(\$[^$]+\$)/g)
		.map((part) => (part.startsWith('$') && part.endsWith('$') && part.length > 1 ? tex(part.slice(1, -1)) : escapeHtml(part)))
		.join('');
}

export function literalTex(literal: number, features: number): string {
	const index = (literal % features) + 1;
	return literal < features ? `x_{${index}}` : `\\lnot x_{${index}}`;
}

export function signed(value: number): string {
	return value > 0 ? `+${value}` : value < 0 ? `-${-value}` : '0';
}
