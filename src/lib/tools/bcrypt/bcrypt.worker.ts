import { runBcrypt, type BcryptRequest } from './bcrypt';

self.onmessage = (event: MessageEvent<BcryptRequest>) => {
	void runBcrypt(event.data).then((response) => {
		self.postMessage(response);
	});
};
