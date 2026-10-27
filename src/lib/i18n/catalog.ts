// Aggregates the messages each tool declares in its own `messages.ts`.
import { messages as jwt } from '../tools/jwt/messages.js';
import { messages as bcrypt } from '../tools/bcrypt/messages.js';
import { messages as argon2 } from '../tools/argon2/messages.js';
import { messages as cpfcnpj } from '../tools/cpfcnpj/messages.js';
import { messages as plate } from '../tools/plate/messages.js';
import { messages as card } from '../tools/card/messages.js';
import { messages as cron } from '../tools/cron/messages.js';
import { messages as jsontypes } from '../tools/jsontypes/messages.js';
import { messages as dataformat } from '../tools/dataformat/messages.js';
import { messages as sql } from '../tools/sql/messages.js';
import { messages as escape } from '../tools/escape/messages.js';
import { messages as unicode } from '../tools/unicode/messages.js';
import { messages as qr } from '../tools/qr/messages.js';
import { messages as image } from '../tools/image/messages.js';
import { messages as lines } from '../tools/lines/messages.js';
import { messages as cidr } from '../tools/cidr/messages.js';
import { messages as chmod } from '../tools/chmod/messages.js';
import { messages as httpstatus } from '../tools/httpstatus/messages.js';

export type ExtraKey = keyof (typeof jwt.pt &
	typeof bcrypt.pt &
	typeof argon2.pt &
	typeof cpfcnpj.pt &
	typeof plate.pt &
	typeof card.pt &
	typeof cron.pt &
	typeof jsontypes.pt &
	typeof dataformat.pt &
	typeof sql.pt &
	typeof escape.pt &
	typeof unicode.pt &
	typeof qr.pt &
	typeof image.pt &
	typeof lines.pt &
	typeof cidr.pt &
	typeof chmod.pt &
	typeof httpstatus.pt);

export const extraPt: Record<ExtraKey, string> = {
	...jwt.pt,
	...bcrypt.pt,
	...argon2.pt,
	...cpfcnpj.pt,
	...plate.pt,
	...card.pt,
	...cron.pt,
	...jsontypes.pt,
	...dataformat.pt,
	...sql.pt,
	...escape.pt,
	...unicode.pt,
	...qr.pt,
	...image.pt,
	...lines.pt,
	...cidr.pt,
	...chmod.pt,
	...httpstatus.pt
};

export const extraEn: Record<ExtraKey, string> = {
	...jwt.en,
	...bcrypt.en,
	...argon2.en,
	...cpfcnpj.en,
	...plate.en,
	...card.en,
	...cron.en,
	...jsontypes.en,
	...dataformat.en,
	...sql.en,
	...escape.en,
	...unicode.en,
	...qr.en,
	...image.en,
	...lines.en,
	...cidr.en,
	...chmod.en,
	...httpstatus.en
};
