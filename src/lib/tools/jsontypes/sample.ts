/** Example loaded in the UI and reused by the tests. */
export const SAMPLE = JSON.stringify(
	{
		id: 1,
		'user-name': 'ana',
		score: 9.5,
		note: null,
		address: { city: 'Rio', zip: '20000' },
		items: [
			{ sku: 'a', qty: 2, label: null },
			{ sku: 'b', qty: 3, price: 1.5, label: 'L' }
		],
		tags: ['x', 'y']
	},
	undefined,
	2
);
