import { runRegex, type RegexRequest } from './regex';

self.onmessage = (event: MessageEvent<RegexRequest>) => {
	self.postMessage(runRegex(event.data));
};
