export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const clampByte = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

export function parseColor(input: string): Rgb | undefined {
	const text = input.trim().toLowerCase();
	const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
	if (hex?.[1]) {
		const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
		return {
			r: parseInt(digits.slice(0, 2), 16),
			g: parseInt(digits.slice(2, 4), 16),
			b: parseInt(digits.slice(4, 6), 16)
		};
	}
	const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(text);
	if (rgb) {
		return { r: clampByte(Number(rgb[1])), g: clampByte(Number(rgb[2])), b: clampByte(Number(rgb[3])) };
	}
	const hsl = /^hsla?\(\s*(-?[\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[,/]\s*[\d.]+%?\s*)?\)$/.exec(text);
	if (hsl) {
		return hslToRgb({ h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) });
	}
	return undefined;
}

export function rgbToHex(color: Rgb): string {
	return `#${[color.r, color.g, color.b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function rgbToHsl(color: Rgb): Hsl {
	const r = color.r / 255;
	const g = color.g / 255;
	const b = color.b / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const lightness = (max + min) / 2;
	const delta = max - min;
	if (delta === 0) {
		return { h: 0, s: 0, l: Math.round(lightness * 100) };
	}
	const saturation = delta / (1 - Math.abs(2 * lightness - 1));
	let hue: number;
	if (max === r) {
		hue = ((g - b) / delta) % 6;
	} else if (max === g) {
		hue = (b - r) / delta + 2;
	} else {
		hue = (r - g) / delta + 4;
	}
	return {
		h: Math.round((hue * 60 + 360) % 360),
		s: Math.round(saturation * 100),
		l: Math.round(lightness * 100)
	};
}

export function hslToRgb(color: Hsl): Rgb {
	const hue = ((color.h % 360) + 360) % 360;
	const saturation = Math.min(100, Math.max(0, color.s)) / 100;
	const lightness = Math.min(100, Math.max(0, color.l)) / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
	const offset = lightness - chroma / 2;
	const sectors: [number, number, number][] = [
		[chroma, x, 0],
		[x, chroma, 0],
		[0, chroma, x],
		[0, x, chroma],
		[x, 0, chroma],
		[chroma, 0, x]
	];
	const [r, g, b] = sectors[Math.floor(hue / 60) % 6] ?? [0, 0, 0];
	return {
		r: clampByte((r + offset) * 255),
		g: clampByte((g + offset) * 255),
		b: clampByte((b + offset) * 255)
	};
}

function channelLuminance(value: number): number {
	const scaled = value / 255;
	return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: Rgb): number {
	return (
		0.2126 * channelLuminance(color.r) +
		0.7152 * channelLuminance(color.g) +
		0.0722 * channelLuminance(color.b)
	);
}

export function contrastRatio(first: Rgb, second: Rgb): number {
	const lighter = Math.max(luminance(first), luminance(second));
	const darker = Math.min(luminance(first), luminance(second));
	return (lighter + 0.05) / (darker + 0.05);
}
