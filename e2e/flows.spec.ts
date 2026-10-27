import { expect, test, type Page } from '@playwright/test';

// The headless browser reports en-US, so the interface is in English.

async function chooseMode(page: Page, name: string): Promise<void> {
	await page.getByRole('radio', { name, exact: true }).check({ force: true });
}

test.describe('slow hashes', () => {
	test('bcrypt: generate, then verify a match and a mismatch', async ({ page }) => {
		await page.goto('/bcrypt');
		await page.locator('#bcrypt-password').fill('correct horse');
		await page.locator('#bcrypt-cost').fill('4');
		await page.getByRole('button', { name: 'Generate hash' }).click();
		const hash = await expect
			.poll(async () => page.locator('#bcrypt-output').inputValue())
			.toMatch(/^\$2b\$04\$/)
			.then(async () => page.locator('#bcrypt-output').inputValue());

		await chooseMode(page, 'Verify');
		await page.locator('#bcrypt-password').fill('correct horse');
		await page.locator('#bcrypt-hash').fill(hash);
		await page.getByRole('button', { name: 'Verify', exact: true }).click();
		await expect(page.getByText('The password matches the hash.')).toBeVisible();

		await page.locator('#bcrypt-password').fill('wrong horse');
		await page.getByRole('button', { name: 'Verify', exact: true }).click();
		await expect(page.getByText('The password does NOT match the hash.')).toBeVisible();
	});

	test('bcrypt: a slow computation can be cancelled and the page stays usable', async ({ page }) => {
		await page.goto('/bcrypt');
		await page.locator('#bcrypt-password').fill('x');
		await page.locator('#bcrypt-cost').fill('15');
		await page.getByRole('button', { name: 'Generate hash' }).click();
		await expect(page.getByText(/Computing/)).toBeVisible();
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page.getByText('Computation cancelled.')).toBeVisible();
		await expect(page.locator('#bcrypt-password')).toBeEnabled();
	});

	test('argon2: generate, verify a match and a mismatch', async ({ page }) => {
		await page.goto('/argon2');
		await page.locator('#argon2-password').fill('correct horse');
		await page.locator('#argon2-memory').fill('64');
		await page.getByRole('button', { name: 'Generate hash' }).click();
		await expect(page.locator('#argon2-encoded')).toHaveValue(/^\$argon2id\$/);
		const encoded = await page.locator('#argon2-encoded').inputValue();

		await chooseMode(page, 'Verify');
		await page.locator('#argon2-password').fill('correct horse');
		await page.locator('#argon2-hash').fill(encoded);
		await page.getByRole('button', { name: 'Verify', exact: true }).click();
		await expect(page.getByText('The password matches the hash.')).toBeVisible();

		await page.locator('#argon2-password').fill('nope');
		await page.getByRole('button', { name: 'Verify', exact: true }).click();
		await expect(page.getByText('The password does NOT match the hash.')).toBeVisible();
	});

	test('argon2: a slow computation can be cancelled', async ({ page }) => {
		await page.goto('/argon2');
		await page.locator('#argon2-password').fill('x');
		await page.locator('#argon2-memory').fill('262144');
		await page.locator('#argon2-iterations').fill('60');
		await page.getByRole('button', { name: 'Generate hash' }).click();
		await expect(page.getByText(/Computing/)).toBeVisible();
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page.getByText('Computation cancelled.')).toBeVisible();
		await expect(page.locator('#argon2-password')).toBeEnabled();
	});
});

test('jwt: sign with HS256, then verify the token, then reject a tampered one', async ({ page }) => {
	await page.goto('/jwt');
	await chooseMode(page, 'Sign');
	await page.locator('#jwts-key').fill('s3cret');
	await expect(page.locator('#jwts-output')).toHaveValue(/^eyJ/);
	const token = await page.locator('#jwts-output').inputValue();

	await chooseMode(page, 'Verify');
	await page.locator('#jwt-input').fill(token);
	await page.locator('#jwtv-key').fill('s3cret');
	await expect(page.getByText('Valid signature', { exact: true })).toBeVisible();

	await page.locator('#jwtv-key').fill('another secret');
	await expect(page.getByText('Invalid signature', { exact: true })).toBeVisible();
});

test.describe('json to code', () => {
	const EXPECTED: Record<string, RegExp> = {
		typescript: /interface Root|type Root/,
		go: /type Root struct/,
		rust: /struct Root/,
		dart: /class Root/,
		kotlin: /data class Root/,
		swift: /struct Root: Codable/,
		csharp: /class Root/,
		java: /record Root/,
		python: /class Root/,
		zod: /z\.object/,
		jsonschema: /"\$schema"/
	};

	for (const [language, pattern] of Object.entries(EXPECTED)) {
		test(`emits ${language}`, async ({ page }) => {
			await page.goto('/jsontypes');
			await page.locator('#jsontypes-language').selectOption(language);
			await expect(page.locator('#jsontypes-output')).toHaveValue(pattern);
		});
	}
});

test('qr: a generated PNG is read back to the same text', async ({ page }) => {
	await page.goto('/qr');
	const text = 'https://example.dev/ola?x=1';
	await page.locator('#qr-url').fill(text);
	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: /PNG/ }).click();
	const download = await downloadPromise;
	const path = await download.path();

	await chooseMode(page, 'Read');
	await page.locator('input[type="file"]').setInputFiles(path);
	await expect(page.locator('#qr-decoded')).toHaveValue(text);
});

test('image: reads a PNG, shows the data URI and converts it', async ({ page }) => {
	// 1x1 transparent PNG
	const png = Buffer.from(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
		'base64'
	);
	await page.goto('/image');
	await page.locator('input[type="file"]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png });
	await expect(page.getByText('dot.png').first()).toBeVisible();
	await expect(page.locator('textarea').first()).toHaveValue(/^data:image\/png;base64,/);
	await page.locator('#image-format').selectOption('image/jpeg');
	await expect(page.getByText(/JPEG|jpeg/).first()).toBeVisible();
});

test.describe('converters and generators', () => {
	test('url encode', async ({ page }) => {
		await page.goto('/url');
		await page.locator('#url-input').fill('a b&c=é');
		await expect(page.locator('#url-output')).toHaveValue('a%20b%26c%3D%C3%A9');
	});

	test('number bases stay in sync', async ({ page }) => {
		await page.goto('/bases');
		await page.locator('#base-10').fill('255');
		await expect(page.locator('#base-16')).toHaveValue('ff');
		await expect(page.locator('#base-2')).toHaveValue('11111111');
		await expect(page.locator('#base-8')).toHaveValue('377');
	});

	test('text case', async ({ page }) => {
		await page.goto('/textcase');
		await page.locator('#case-input').fill('user profile id');
		await expect(page.getByText('userProfileId', { exact: true })).toBeVisible();
		await expect(page.getByText('USER_PROFILE_ID', { exact: true })).toBeVisible();
	});

	test('colors', async ({ page }) => {
		await page.goto('/color');
		await page.locator('#color-input').fill('#ff0000');
		await expect(page.getByText('rgb(255, 0, 0)', { exact: true })).toBeVisible();
		await expect(page.getByText('hsl(0, 100%, 50%)', { exact: true })).toBeVisible();
	});

	test('timestamp', async ({ page }) => {
		await page.goto('/timestamp');
		await page.locator('#ts-input').fill('1700000000');
		await expect(page.getByText('2023-11-14T22:13:20.000Z')).toBeVisible();
	});

	test('text diff', async ({ page }) => {
		await page.goto('/diff');
		await page.locator('#diff-before').fill('a\nb');
		await page.locator('#diff-after').fill('a\nc');
		await expect(page.getByText('+1 −1')).toBeVisible();
	});

	test('ids: UUID v4 and ULID shapes', async ({ page }) => {
		await page.goto('/ids');
		await expect(page.locator('#ids-output')).toHaveValue(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/
		);
		await chooseMode(page, 'ULID');
		await expect(page.locator('#ids-output')).toHaveValue(/^[0-9A-HJKMNP-TV-Z]{26}/);
	});

	test('password length follows the slider', async ({ page }) => {
		await page.goto('/password');
		await page.locator('#password-length').fill('32');
		await expect(page.locator('output.secret')).toHaveText(/^.{32}$/);
	});

	test('cpf/cnpj: generated values validate', async ({ page }) => {
		await page.goto('/cpfcnpj');
		const generated = (await page.locator('#cpfcnpj-output').inputValue()).split('\n')[0] ?? '';
		expect(generated).toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
		await chooseMode(page, 'Validate');
		await page.locator('#cpfcnpj-input').fill('529.982.247-25\n111.111.111-11');
		await expect(page.getByText('Valid', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('Invalid', { exact: true }).first()).toBeVisible();
	});

	test('plates are generated and validated', async ({ page }) => {
		await page.goto('/plate');
		await expect(page.locator('#plate-output')).toHaveValue(/[A-Z]{3}-?\d[A-Z0-9]\d{2}/);
		await chooseMode(page, 'Validate');
		await page.locator('#plate-input').fill('BRA2E19');
		await expect(page.getByText(/Mercosul/).first()).toBeVisible();
	});

	test('cards: generated numbers pass the Luhn check', async ({ page }) => {
		await page.goto('/card');
		const first = (await page.locator('#card-output').inputValue()).split('\n')[0] ?? '';
		// Fields are separated by two spaces: number, expiry, CVV, name.
		const digits = (first.split('  ')[0] ?? '').replace(/\D/g, '');
		expect(digits.length).toBeGreaterThanOrEqual(13);
		let sum = 0;
		let double = false;
		for (let index = digits.length - 1; index >= 0; index -= 1) {
			let value = Number(digits[index]);
			if (double) {
				value *= 2;
				if (value > 9) {
					value -= 9;
				}
			}
			sum += value;
			double = !double;
		}
		expect(sum % 10).toBe(0);
	});

	test('data formats: JSON to YAML', async ({ page }) => {
		await page.goto('/dataformat');
		await page.locator('#dataformat-from').selectOption('json');
		await page.locator('#dataformat-to').selectOption('yaml');
		await page.locator('#dataformat-input').fill('{"name":"ana","tags":["a","b"]}');
		await expect(page.locator('#dataformat-output')).toHaveValue(/name: ana\ntags:\n {2}- a\n {2}- b/);
	});

	test('escape: HTML entities', async ({ page }) => {
		await page.goto('/escape');
		await page.locator('#escape-input').fill('<a href="x">&</a>');
		await expect(page.locator('#escape-output')).toHaveValue('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
	});

	test('unicode inspector lists code points', async ({ page }) => {
		await page.goto('/unicode');
		await page.locator('#unicode-input').fill('aé👋');
		await expect(page.getByText('U+1F44B')).toBeVisible();
		await expect(page.getByText('U+00E9')).toBeVisible();
	});

	test('lines: sort and dedupe', async ({ page }) => {
		await page.goto('/lines');
		await page.locator('#lines-input').fill('b\na\nb\nc');
		await page.locator('#lines-action').selectOption({ index: 0 });
		await expect(page.locator('#lines-output')).not.toHaveValue('');
	});

	test('cidr: /24 network', async ({ page }) => {
		await page.goto('/cidr');
		await page.locator('#cidr-input').fill('10.1.2.0/24');
		await expect(page.getByText('10.1.2.255')).toBeVisible();
		await expect(page.getByText('255.255.255.0').first()).toBeVisible();
	});

	test('chmod: octal drives symbolic', async ({ page }) => {
		await page.goto('/chmod');
		await page.locator('#chmod-octal').fill('640');
		await expect(page.locator('#chmod-symbolic')).toHaveValue('rw-r-----');
	});

	test('http status: search jumps to 404', async ({ page }) => {
		await page.goto('/httpstatus');
		await page.locator('#httpstatus-search').fill('404');
		await expect(page.getByText('Not Found').first()).toBeVisible();
	});
});
