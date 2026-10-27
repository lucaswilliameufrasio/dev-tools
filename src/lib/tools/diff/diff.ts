export type DiffLine = { kind: 'same' | 'added' | 'removed'; text: string };

export type DiffResult =
	| { ok: true; lines: DiffLine[]; added: number; removed: number }
	| { ok: false; reason: 'too-large' };

const MAX_CELLS = 4_000_000;

export function diffLines(before: string, after: string): DiffResult {
	const left = before === '' ? [] : before.split('\n');
	const right = after === '' ? [] : after.split('\n');
	if (left.length * right.length > MAX_CELLS) {
		return { ok: false, reason: 'too-large' };
	}
	const width = right.length + 1;
	const table = new Uint32Array((left.length + 1) * width);
	for (let row = left.length - 1; row >= 0; row -= 1) {
		for (let column = right.length - 1; column >= 0; column -= 1) {
			if (left[row] === right[column]) {
				table[row * width + column] = (table[(row + 1) * width + column + 1] ?? 0) + 1;
			} else {
				table[row * width + column] = Math.max(
					table[(row + 1) * width + column] ?? 0,
					table[row * width + column + 1] ?? 0
				);
			}
		}
	}
	const lines: DiffLine[] = [];
	let added = 0;
	let removed = 0;
	let row = 0;
	let column = 0;
	while (row < left.length && column < right.length) {
		if (left[row] === right[column]) {
			lines.push({ kind: 'same', text: left[row] ?? '' });
			row += 1;
			column += 1;
		} else if (
			(table[(row + 1) * width + column] ?? 0) >= (table[row * width + column + 1] ?? 0)
		) {
			lines.push({ kind: 'removed', text: left[row] ?? '' });
			removed += 1;
			row += 1;
		} else {
			lines.push({ kind: 'added', text: right[column] ?? '' });
			added += 1;
			column += 1;
		}
	}
	while (row < left.length) {
		lines.push({ kind: 'removed', text: left[row] ?? '' });
		removed += 1;
		row += 1;
	}
	while (column < right.length) {
		lines.push({ kind: 'added', text: right[column] ?? '' });
		added += 1;
		column += 1;
	}
	return { ok: true, lines, added, removed };
}
