import { runArgon2, type Argon2Request } from './argon2';

self.onmessage = (event: MessageEvent<Argon2Request>) => {
	void runArgon2(event.data).then((response) => {
		self.postMessage(response);
	});
};
