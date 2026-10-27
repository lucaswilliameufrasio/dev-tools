export type StatusCategory = 1 | 2 | 3 | 4 | 5;

export type Localized = { pt: string; en: string };

export type HttpStatus = {
	code: number;
	name: string;
	category: StatusCategory;
	description: Localized;
	whenToUse: Localized;
	rfc: string;
	nonStandard: boolean;
};

function categoryOf(code: number): StatusCategory {
	const digit = Math.floor(code / 100);
	switch (digit) {
		case 1:
		case 2:
		case 3:
		case 4:
			return digit;
		default:
			return 5;
	}
}

function status(
	code: number,
	name: string,
	rfc: string,
	description: Localized,
	whenToUse: Localized,
	nonStandard = false
): HttpStatus {
	return { code, name, category: categoryOf(code), description, whenToUse, rfc, nonStandard };
}

export const STATUSES: readonly HttpStatus[] = [
	status(100, 'Continue', 'RFC 9110 §15.2.1',
		{ pt: 'O servidor recebeu os cabeçalhos e o cliente pode enviar o corpo da requisição.', en: 'The server received the headers and the client may go on and send the request body.' },
		{ pt: 'Resposta a "Expect: 100-continue" antes de uploads grandes. Quase sempre tratada pelo servidor HTTP, não pela aplicação.', en: 'Answer to "Expect: 100-continue" before large uploads. Usually handled by the HTTP server, not your application.' }),
	status(101, 'Switching Protocols', 'RFC 9110 §15.2.2',
		{ pt: 'O servidor aceitou trocar de protocolo, como na atualização para WebSocket.', en: 'The server agreed to switch protocols, such as the upgrade to WebSocket.' },
		{ pt: 'Use no handshake de WebSocket (Upgrade: websocket). Depois dele a conexão deixa de falar HTTP.', en: 'Use it in the WebSocket handshake (Upgrade: websocket). After it the connection no longer speaks HTTP.' }),
	status(102, 'Processing', 'RFC 2518 §10.1',
		{ pt: 'O servidor ainda está processando uma requisição WebDAV demorada. Está obsoleto.', en: 'The server is still processing a long WebDAV request. It is obsolete.' },
		{ pt: 'Evite em APIs novas. Para trabalho demorado, responda 202 e ofereça uma URL para consultar o andamento.', en: 'Avoid it in new APIs. For long work, answer 202 and offer a URL to poll for progress.' }),
	status(103, 'Early Hints', 'RFC 8297',
		{ pt: 'Permite enviar cabeçalhos Link antes da resposta final para o navegador começar a carregar recursos.', en: 'Sends Link headers ahead of the final response so the browser can start preloading resources.' },
		{ pt: 'Útil em CDNs e servidores web para acelerar páginas. Não é usado em APIs JSON.', en: 'Useful in CDNs and web servers to speed up pages. Not used in JSON APIs.' }),
	status(200, 'OK', 'RFC 9110 §15.3.1',
		{ pt: 'A requisição deu certo. O significado do corpo depende do método.', en: 'The request succeeded. The meaning of the body depends on the method.' },
		{ pt: 'Resposta padrão para GET, PUT e PATCH bem-sucedidos que devolvem conteúdo. Se não há corpo, prefira 204.', en: 'Default for successful GET, PUT and PATCH that return content. If there is no body, prefer 204.' }),
	status(201, 'Created', 'RFC 9110 §15.3.2',
		{ pt: 'Um novo recurso foi criado como resultado da requisição.', en: 'A new resource was created as a result of the request.' },
		{ pt: 'Devolva em POST que cria algo, com o cabeçalho Location apontando para o novo recurso e, de preferência, sua representação.', en: 'Return it from a POST that creates something, with a Location header pointing to the new resource and ideally its representation.' }),
	status(202, 'Accepted', 'RFC 9110 §15.3.3',
		{ pt: 'A requisição foi aceita, mas o processamento ainda não terminou.', en: 'The request was accepted, but processing has not finished.' },
		{ pt: 'Para trabalho assíncrono: devolva 202 com uma URL de status (Location) para o cliente consultar o resultado.', en: 'For asynchronous work: return 202 with a status URL (Location) the client can poll for the result.' }),
	status(203, 'Non-Authoritative Information', 'RFC 9110 §15.3.4',
		{ pt: 'O conteúdo veio de um intermediário (proxy) que modificou a resposta original.', en: 'The content came from an intermediary (proxy) that modified the origin response.' },
		{ pt: 'Raro. Normalmente é um proxy transformador quem o gera, não a sua API.', en: 'Rare. Usually a transforming proxy sets it, not your API.' }),
	status(204, 'No Content', 'RFC 9110 §15.3.5',
		{ pt: 'Deu certo e não há corpo na resposta.', en: 'Success, and there is no response body.' },
		{ pt: 'Ideal para DELETE e para PUT/PATCH que não devolvem o recurso. Não envie corpo junto.', en: 'Ideal for DELETE and for PUT/PATCH that do not return the resource. Do not send a body.' }),
	status(205, 'Reset Content', 'RFC 9110 §15.3.6',
		{ pt: 'Deu certo e o cliente deve limpar a visão do documento, por exemplo um formulário.', en: 'Success, and the client should reset the document view, for example a form.' },
		{ pt: 'Muito pouco usado. Serve para limpar um formulário depois do envio.', en: 'Rarely used. Fits clearing a form after submission.' }),
	status(206, 'Partial Content', 'RFC 9110 §15.3.7',
		{ pt: 'O servidor devolveu só uma parte do recurso, como pedido por um cabeçalho Range.', en: 'The server returned only part of the resource, as requested by a Range header.' },
		{ pt: 'Downloads retomáveis e streaming de vídeo. Envie Content-Range e Accept-Ranges.', en: 'Resumable downloads and video streaming. Send Content-Range and Accept-Ranges.' }),
	status(207, 'Multi-Status', 'RFC 4918 §11.1',
		{ pt: 'O corpo traz vários resultados independentes, um por sub-operação (WebDAV).', en: 'The body carries several independent results, one per sub-operation (WebDAV).' },
		{ pt: 'Em operações em lote, devolva 207 com o status de cada item em vez de falhar tudo por causa de um erro.', en: 'In batch operations, return 207 with the status of each item instead of failing everything over one error.' }),
	status(208, 'Already Reported', 'RFC 5842 §7.1',
		{ pt: 'Os membros do binding já foram listados numa parte anterior da resposta (WebDAV).', en: 'The binding members were already listed earlier in the response (WebDAV).' },
		{ pt: 'Específico de WebDAV. Não é necessário em APIs comuns.', en: 'WebDAV specific. Not needed in ordinary APIs.' }),
	status(226, 'IM Used', 'RFC 3229 §10.4.1',
		{ pt: 'O servidor aplicou uma ou mais manipulações de instância (delta encoding) ao recurso.', en: 'The server applied one or more instance manipulations (delta encoding) to the resource.' },
		{ pt: 'Praticamente não aparece hoje.', en: 'Practically never seen today.' }),
	status(300, 'Multiple Choices', 'RFC 9110 §15.4.1',
		{ pt: 'Há várias representações possíveis e o cliente pode escolher uma.', en: 'There are several possible representations and the client may pick one.' },
		{ pt: 'Raro na prática. Para negociação de conteúdo, prefira os cabeçalhos Accept.', en: 'Rare in practice. For content negotiation, prefer the Accept headers.' }),
	status(301, 'Moved Permanently', 'RFC 9110 §15.4.2',
		{ pt: 'O recurso mudou de endereço para sempre. Use a nova URL do cabeçalho Location.', en: 'The resource moved to a new address permanently. Use the new URL from the Location header.' },
		{ pt: 'Para migrar URLs mantendo SEO. Clientes podem trocar POST por GET; se precisa manter o método, use 308.', en: 'To migrate URLs while keeping SEO. Clients may turn POST into GET; if the method must be kept, use 308.' }),
	status(302, 'Found', 'RFC 9110 §15.4.3',
		{ pt: 'Redirecionamento temporário para outra URL.', en: 'Temporary redirect to another URL.' },
		{ pt: 'Redirecionamentos temporários simples (por exemplo, login). Para ser explícito sobre o método, prefira 303 ou 307.', en: 'Simple temporary redirects (for example, login). To be explicit about the method, prefer 303 or 307.' }),
	status(303, 'See Other', 'RFC 9110 §15.4.4',
		{ pt: 'A resposta está em outra URL e deve ser buscada com GET.', en: 'The response is at another URL and should be fetched with GET.' },
		{ pt: 'Depois de um POST, redirecione para a página de resultado (padrão Post/Redirect/Get) evitando reenvio do formulário.', en: 'After a POST, redirect to the result page (Post/Redirect/Get) to avoid form resubmission.' }),
	status(304, 'Not Modified', 'RFC 9110 §15.4.5',
		{ pt: 'O recurso não mudou desde a versão que o cliente já tem em cache.', en: 'The resource has not changed since the version the client already has cached.' },
		{ pt: 'Resposta a requisições condicionais (If-None-Match, If-Modified-Since). Não envie corpo; reenvie ETag e Cache-Control.', en: 'Answer to conditional requests (If-None-Match, If-Modified-Since). Send no body; repeat ETag and Cache-Control.' }),
	status(305, 'Use Proxy', 'RFC 9110 §15.4.6',
		{ pt: 'Antigamente indicava que o recurso só era acessível por um proxy. Está obsoleto.', en: 'It used to say the resource was only reachable through a proxy. It is deprecated.' },
		{ pt: 'Não use. Navegadores a ignoram por motivos de segurança.', en: 'Do not use. Browsers ignore it for security reasons.' }),
	status(307, 'Temporary Redirect', 'RFC 9110 §15.4.8',
		{ pt: 'Redirecionamento temporário que mantém o método e o corpo da requisição.', en: 'Temporary redirect that keeps the request method and body.' },
		{ pt: 'Use quando um POST ou PUT precisa ser repetido no novo endereço, por exemplo em failover ou HTTP para HTTPS.', en: 'Use it when a POST or PUT must be repeated at the new address, for example in failover or HTTP to HTTPS.' }),
	status(308, 'Permanent Redirect', 'RFC 9110 §15.4.9',
		{ pt: 'Redirecionamento permanente que mantém o método e o corpo da requisição.', en: 'Permanent redirect that keeps the request method and body.' },
		{ pt: 'Versão permanente do 307: use ao mover um endpoint de API de forma definitiva sem trocar POST por GET.', en: 'Permanent counterpart of 307: use it when moving an API endpoint for good without turning POST into GET.' }),
	status(400, 'Bad Request', 'RFC 9110 §15.5.1',
		{ pt: 'O servidor não entendeu a requisição por erro de sintaxe, cabeçalhos ou corpo malformado.', en: 'The server could not understand the request because of malformed syntax, headers or body.' },
		{ pt: 'JSON inválido, parâmetro com tipo errado, cabeçalho ausente. Se a sintaxe está certa mas as regras de negócio falham, use 422.', en: 'Invalid JSON, wrong parameter type, missing header. If the syntax is fine but business rules fail, use 422.' }),
	status(401, 'Unauthorized', 'RFC 9110 §15.5.2',
		{ pt: 'A requisição não tem credenciais válidas. Apesar do nome, trata de autenticação.', en: 'The request lacks valid credentials. Despite the name, it is about authentication.' },
		{ pt: '401 = "quem é você?" (token ausente, inválido ou expirado; envie WWW-Authenticate). 403 = "sei quem é, mas não pode".', en: '401 = "who are you?" (missing, invalid or expired token; send WWW-Authenticate). 403 = "I know who you are, but no".' }),
	status(402, 'Payment Required', 'RFC 9110 §15.5.3',
		{ pt: 'Reservado para uso futuro com pagamentos digitais.', en: 'Reserved for future use with digital payments.' },
		{ pt: 'Alguns serviços usam para planos expirados ou cotas pagas esgotadas. Documente se adotar.', en: 'Some services use it for expired plans or exhausted paid quotas. Document it if you adopt it.' }),
	status(403, 'Forbidden', 'RFC 9110 §15.5.4',
		{ pt: 'O servidor entendeu a requisição e se recusa a executá-la. Autenticar de novo não resolve.', en: 'The server understood the request and refuses to fulfil it. Authenticating again will not help.' },
		{ pt: 'Usuário autenticado sem permissão para o recurso. Para esconder a existência do recurso, 404 também é aceitável.', en: 'Authenticated user without permission for the resource. To hide that the resource exists, 404 is also acceptable.' }),
	status(404, 'Not Found', 'RFC 9110 §15.5.5',
		{ pt: 'O servidor não encontrou o recurso pedido.', en: 'The server could not find the requested resource.' },
		{ pt: 'ID ou rota inexistente. Não use para lista vazia (devolva 200 com []). Se o recurso existiu e foi removido de vez, considere 410.', en: 'Unknown ID or route. Do not use it for an empty list (return 200 with []). If the resource existed and was removed for good, consider 410.' }),
	status(405, 'Method Not Allowed', 'RFC 9110 §15.5.6',
		{ pt: 'O método HTTP não é aceito para este recurso.', en: 'The HTTP method is not supported for this resource.' },
		{ pt: 'Obrigatório enviar o cabeçalho Allow com os métodos aceitos (ex.: DELETE em endpoint só de leitura).', en: 'You must send the Allow header listing supported methods (e.g. DELETE on a read-only endpoint).' }),
	status(406, 'Not Acceptable', 'RFC 9110 §15.5.7',
		{ pt: 'O servidor não consegue produzir nenhuma representação aceita pelos cabeçalhos Accept do cliente.', en: 'The server cannot produce any representation the client accepts in its Accept headers.' },
		{ pt: 'Cliente pede application/xml e a API só fala JSON.', en: 'The client asks for application/xml and the API only speaks JSON.' }),
	status(407, 'Proxy Authentication Required', 'RFC 9110 §15.5.8',
		{ pt: 'Como o 401, mas a autenticação é exigida pelo proxy.', en: 'Like 401, but the authentication is required by the proxy.' },
		{ pt: 'Gerado por proxies; envia Proxy-Authenticate. Raramente vem da aplicação.', en: 'Produced by proxies; sends Proxy-Authenticate. Rarely comes from the application.' }),
	status(408, 'Request Timeout', 'RFC 9110 §15.5.9',
		{ pt: 'O servidor esperou demais para receber a requisição completa.', en: 'The server waited too long to receive the complete request.' },
		{ pt: 'Normalmente gerado pelo servidor ou balanceador. O cliente pode repetir a requisição.', en: 'Usually produced by the server or load balancer. The client may retry the request.' }),
	status(409, 'Conflict', 'RFC 9110 §15.5.10',
		{ pt: 'A requisição conflita com o estado atual do recurso.', en: 'The request conflicts with the current state of the resource.' },
		{ pt: 'Valor único duplicado (e-mail já cadastrado), edição concorrente com versão antiga, transição de estado inválida. Explique o conflito no corpo.', en: 'Duplicate unique value (email already registered), concurrent edit with a stale version, invalid state transition. Explain the conflict in the body.' }),
	status(410, 'Gone', 'RFC 9110 §15.5.11',
		{ pt: 'O recurso foi removido de forma permanente e não deve voltar.', en: 'The resource was removed permanently and is not expected back.' },
		{ pt: 'Mais informativo que 404 para endpoints descontinuados ou conteúdo apagado de vez.', en: 'More informative than 404 for retired endpoints or content deleted for good.' }),
	status(411, 'Length Required', 'RFC 9110 §15.5.12',
		{ pt: 'O servidor exige o cabeçalho Content-Length.', en: 'The server requires a Content-Length header.' },
		{ pt: 'Upload sem tamanho declarado num endpoint que não aceita chunked.', en: 'Upload without a declared size on an endpoint that does not accept chunked.' }),
	status(412, 'Precondition Failed', 'RFC 9110 §15.5.13',
		{ pt: 'Uma condição dos cabeçalhos (If-Match, If-Unmodified-Since) não foi satisfeita.', en: 'A condition in the headers (If-Match, If-Unmodified-Since) was not met.' },
		{ pt: 'Controle otimista de concorrência: o ETag enviado não bate com o atual.', en: 'Optimistic concurrency control: the ETag sent does not match the current one.' }),
	status(413, 'Content Too Large', 'RFC 9110 §15.5.14',
		{ pt: 'O corpo da requisição é maior do que o servidor aceita.', en: 'The request body is larger than the server accepts.' },
		{ pt: 'Limite de upload excedido. Informe o tamanho máximo na mensagem de erro.', en: 'Upload limit exceeded. State the maximum size in the error message.' }),
	status(414, 'URI Too Long', 'RFC 9110 §15.5.15',
		{ pt: 'A URL é mais longa do que o servidor aceita.', en: 'The URL is longer than the server accepts.' },
		{ pt: 'Muitos parâmetros na query string. Mova os dados para o corpo de um POST.', en: 'Too many query string parameters. Move the data into a POST body.' }),
	status(415, 'Unsupported Media Type', 'RFC 9110 §15.5.16',
		{ pt: 'O formato do corpo (Content-Type) não é suportado.', en: 'The body format (Content-Type) is not supported.' },
		{ pt: 'Cliente envia text/plain ou XML para um endpoint que só aceita application/json.', en: 'The client sends text/plain or XML to an endpoint that only accepts application/json.' }),
	status(416, 'Range Not Satisfiable', 'RFC 9110 §15.5.17',
		{ pt: 'O intervalo pedido no cabeçalho Range está fora do tamanho do recurso.', en: 'The range requested in the Range header lies outside the resource size.' },
		{ pt: 'Devolva Content-Range: bytes */tamanho para o cliente se corrigir.', en: 'Return Content-Range: bytes */size so the client can correct itself.' }),
	status(417, 'Expectation Failed', 'RFC 9110 §15.5.18',
		{ pt: 'O servidor não pode cumprir a expectativa do cabeçalho Expect.', en: 'The server cannot meet the expectation in the Expect header.' },
		{ pt: 'Raro; ocorre com Expect: 100-continue em servidores que não o suportam.', en: 'Rare; happens with Expect: 100-continue on servers that do not support it.' }),
	status(418, "I'm a teapot", 'RFC 2324 §2.3.2',
		{ pt: 'Piada de 1º de abril (HTCPCP): o servidor é um bule de chá e não faz café.', en: 'An April Fools joke (HTCPCP): the server is a teapot and cannot brew coffee.' },
		{ pt: 'Não use para erros reais. Alguns serviços a usam para barrar bots ou como easter egg.', en: 'Do not use for real errors. Some services use it to turn away bots or as an easter egg.' }),
	status(421, 'Misdirected Request', 'RFC 9110 §15.5.20',
		{ pt: 'A requisição foi enviada a um servidor que não consegue produzir uma resposta para ela.', en: 'The request was sent to a server that is not able to produce a response for it.' },
		{ pt: 'Aparece em HTTP/2 quando uma conexão reaproveitada chega ao host errado. O cliente deve abrir outra conexão.', en: 'Shows up in HTTP/2 when a reused connection reaches the wrong host. The client should open a new connection.' }),
	status(422, 'Unprocessable Content', 'RFC 9110 §15.5.21',
		{ pt: 'A sintaxe está correta, mas o conteúdo não pôde ser processado por falhar regras de validação.', en: 'The syntax is correct, but the content could not be processed because it fails validation rules.' },
		{ pt: '400 = formato quebrado; 422 = formato válido com dados semanticamente inválidos (e-mail mal formado, data no passado). Liste os erros por campo.', en: '400 = broken format; 422 = well-formed request with semantically invalid data (bad email, date in the past). List errors per field.' }),
	status(423, 'Locked', 'RFC 4918 §11.3',
		{ pt: 'O recurso está bloqueado (WebDAV).', en: 'The resource is locked (WebDAV).' },
		{ pt: 'Útil para recursos com bloqueio explícito de edição por outro usuário.', en: 'Useful for resources explicitly locked for editing by another user.' }),
	status(424, 'Failed Dependency', 'RFC 4918 §11.4',
		{ pt: 'A requisição falhou porque dependia de outra que falhou (WebDAV).', en: 'The request failed because it depended on another one that failed (WebDAV).' },
		{ pt: 'Dentro de 207, marca itens que não rodaram por causa de uma falha anterior.', en: 'Inside a 207, marks items that did not run because of an earlier failure.' }),
	status(425, 'Too Early', 'RFC 8470 §5.2',
		{ pt: 'O servidor não quer processar uma requisição que pode ser reproduzida (TLS early data).', en: 'The server is unwilling to process a request that might be replayed (TLS early data).' },
		{ pt: 'Gerado por servidores atrás de TLS 1.3 com 0-RTT; o cliente repete após o handshake.', en: 'Produced by servers behind TLS 1.3 with 0-RTT; the client retries after the handshake.' }),
	status(426, 'Upgrade Required', 'RFC 9110 §15.5.22',
		{ pt: 'O cliente precisa trocar de protocolo para continuar.', en: 'The client must switch to a different protocol to continue.' },
		{ pt: 'Envie o cabeçalho Upgrade indicando o protocolo exigido (por exemplo TLS ou WebSocket).', en: 'Send the Upgrade header naming the required protocol (for example TLS or WebSocket).' }),
	status(428, 'Precondition Required', 'RFC 6585 §3',
		{ pt: 'O servidor exige que a requisição seja condicional.', en: 'The server requires the request to be conditional.' },
		{ pt: 'Obrigue If-Match em PUT/PATCH para evitar sobrescrever alterações de outros clientes.', en: 'Require If-Match on PUT/PATCH to avoid overwriting other clients\' changes.' }),
	status(429, 'Too Many Requests', 'RFC 6585 §4',
		{ pt: 'O cliente enviou requisições demais num período (rate limiting).', en: 'The client sent too many requests in a given time (rate limiting).' },
		{ pt: 'Envie Retry-After (segundos ou data) e, se possível, cabeçalhos com limite e saldo. Clientes devem esperar e usar backoff.', en: 'Send Retry-After (seconds or date) and, if possible, limit and remaining headers. Clients should wait and use backoff.' }),
	status(431, 'Request Header Fields Too Large', 'RFC 6585 §5',
		{ pt: 'Os cabeçalhos, em conjunto ou um deles, são grandes demais.', en: 'The header fields, together or one of them, are too large.' },
		{ pt: 'Costuma ser excesso de cookies ou token gigante. Limpe cookies ou reduza o cabeçalho.', en: 'Usually too many cookies or a huge token. Clear cookies or shrink the header.' }),
	status(451, 'Unavailable For Legal Reasons', 'RFC 7725 §3',
		{ pt: 'O recurso foi bloqueado por exigência legal.', en: 'The resource is blocked because of a legal demand.' },
		{ pt: 'Ordem judicial, censura regional ou restrição de licença. Referência ao livro Fahrenheit 451.', en: 'Court order, regional censorship or licence restriction. A nod to the book Fahrenheit 451.' }),
	status(499, 'Client Closed Request', 'nginx',
		{ pt: 'O cliente encerrou a conexão antes de o servidor responder. Usado só em logs do nginx.', en: 'The client closed the connection before the server answered. Used only in nginx logs.' },
		{ pt: 'Aparece em logs quando clientes desistem por timeout. Muitos 499 indicam respostas lentas.', en: 'Shows up in logs when clients give up on a timeout. Many 499s point to slow responses.' },
		true),
	status(500, 'Internal Server Error', 'RFC 9110 §15.6.1',
		{ pt: 'Erro inesperado no servidor impediu o atendimento da requisição.', en: 'An unexpected server error prevented the request from being fulfilled.' },
		{ pt: 'Exceção não tratada. Registre em log com um ID de correlação e não exponha stack trace ao cliente.', en: 'Unhandled exception. Log it with a correlation ID and never expose the stack trace to the client.' }),
	status(501, 'Not Implemented', 'RFC 9110 §15.6.2',
		{ pt: 'O servidor não suporta a funcionalidade ou o método pedido.', en: 'The server does not support the requested feature or method.' },
		{ pt: 'Funcionalidade planejada e ainda não construída, ou método desconhecido. Diferente de 405, que vale para um recurso específico.', en: 'Planned but not yet built, or unknown method. Unlike 405, which applies to a specific resource.' }),
	status(502, 'Bad Gateway', 'RFC 9110 §15.6.3',
		{ pt: 'Um gateway ou proxy recebeu uma resposta inválida do servidor de origem.', en: 'A gateway or proxy received an invalid response from the upstream server.' },
		{ pt: 'Origem caiu ou respondeu lixo. Verifique se o app está no ar e se o proxy aponta para a porta certa.', en: 'The upstream crashed or returned garbage. Check that the app is up and that the proxy targets the right port.' }),
	status(503, 'Service Unavailable', 'RFC 9110 §15.6.4',
		{ pt: 'O servidor não pode atender no momento, por sobrecarga ou manutenção.', en: 'The server cannot handle the request right now, due to overload or maintenance.' },
		{ pt: 'Manutenção planejada ou sobrecarga: envie Retry-After. É a resposta certa para health checks falhando durante o deploy.', en: 'Planned maintenance or overload: send Retry-After. The right answer for failing health checks during deploys.' }),
	status(504, 'Gateway Timeout', 'RFC 9110 §15.6.5',
		{ pt: 'O gateway não recebeu resposta do servidor de origem a tempo.', en: 'The gateway did not get a timely response from the upstream server.' },
		{ pt: 'Origem lenta demais. Aumente o timeout do proxy só se fizer sentido; melhor otimizar ou tornar a operação assíncrona (202).', en: 'Upstream too slow. Raise the proxy timeout only when it makes sense; better to optimize or make the operation asynchronous (202).' }),
	status(505, 'HTTP Version Not Supported', 'RFC 9110 §15.6.6',
		{ pt: 'O servidor não suporta a versão do HTTP usada na requisição.', en: 'The server does not support the HTTP version used in the request.' },
		{ pt: 'Raro; clientes muito antigos ou protocolos mal configurados.', en: 'Rare; very old clients or misconfigured protocols.' }),
	status(506, 'Variant Also Negotiates', 'RFC 2295 §8.1',
		{ pt: 'Erro de configuração na negociação transparente de conteúdo.', en: 'Configuration error in transparent content negotiation.' },
		{ pt: 'Praticamente nunca visto.', en: 'Practically never seen.' }),
	status(507, 'Insufficient Storage', 'RFC 4918 §11.5',
		{ pt: 'O servidor não tem espaço para guardar o necessário para concluir a requisição (WebDAV).', en: 'The server cannot store the representation needed to complete the request (WebDAV).' },
		{ pt: 'Disco ou cota cheia no servidor.', en: 'Server disk or quota is full.' }),
	status(508, 'Loop Detected', 'RFC 5842 §7.2',
		{ pt: 'O servidor encontrou um laço infinito ao processar a requisição (WebDAV).', en: 'The server detected an infinite loop while processing the request (WebDAV).' },
		{ pt: 'Referências circulares em operações recursivas.', en: 'Circular references in recursive operations.' }),
	status(510, 'Not Extended', 'RFC 2774 §7',
		{ pt: 'O servidor exige extensões adicionais da requisição. Obsoleto.', en: 'The server requires further extensions to the request. Obsolete.' },
		{ pt: 'Quase nunca visto; não use.', en: 'Almost never seen; do not use.' }),
	status(511, 'Network Authentication Required', 'RFC 6585 §6',
		{ pt: 'O cliente precisa se autenticar para acessar a rede.', en: 'The client needs to authenticate to gain network access.' },
		{ pt: 'Gerado por portais cativos (Wi-Fi de hotel ou aeroporto), não pela sua API. Clientes de API podem ver isso por engano.', en: 'Produced by captive portals (hotel or airport Wi-Fi), not by your API. API clients may see it unexpectedly.' }),
	status(520, 'Web Server Returned an Unknown Error', 'Cloudflare',
		{ pt: 'A origem devolveu algo que o Cloudflare não entendeu ou fechou a conexão de forma inesperada.', en: 'The origin returned something Cloudflare could not understand or closed the connection unexpectedly.' },
		{ pt: 'Veja logs da origem: crash, cabeçalhos enormes ou resposta vazia.', en: 'Check origin logs: crash, huge headers or empty response.' },
		true),
	status(521, 'Web Server Is Down', 'Cloudflare',
		{ pt: 'O Cloudflare não conseguiu conectar ao servidor de origem, que recusou a conexão.', en: 'Cloudflare could not connect to the origin server, which refused the connection.' },
		{ pt: 'Origem fora do ar ou firewall bloqueando os IPs do Cloudflare.', en: 'Origin is down or a firewall is blocking Cloudflare IPs.' },
		true),
	status(522, 'Connection Timed Out', 'Cloudflare',
		{ pt: 'O Cloudflare não completou a conexão TCP com a origem a tempo.', en: 'Cloudflare did not complete the TCP connection to the origin in time.' },
		{ pt: 'Origem sobrecarregada, rota de rede lenta ou IP errado no DNS.', en: 'Overloaded origin, slow network route or wrong IP in DNS.' },
		true),
	status(523, 'Origin Is Unreachable', 'Cloudflare',
		{ pt: 'O Cloudflare não conseguiu alcançar a origem, normalmente por problema de DNS ou de rota.', en: 'Cloudflare could not reach the origin, usually because of a DNS or routing problem.' },
		{ pt: 'Confira o registro DNS da origem e a conectividade.', en: 'Check the origin DNS record and connectivity.' },
		true),
	status(524, 'A Timeout Occurred', 'Cloudflare',
		{ pt: 'A conexão com a origem foi feita, mas ela não respondeu dentro do limite (cerca de 100 segundos).', en: 'The connection to the origin was made, but it did not reply within the limit (about 100 seconds).' },
		{ pt: 'Requisições longas: mova para processamento assíncrono (202) ou envie dados progressivamente.', en: 'Long requests: move to asynchronous processing (202) or stream data progressively.' },
		true)
];

export const CATEGORIES: readonly StatusCategory[] = [1, 2, 3, 4, 5];

export type Locale = 'pt' | 'en';

export function fullName(entry: HttpStatus): string {
	return `${entry.code} ${entry.name}`;
}

function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

/**
 * Filters statuses by text and categories. An exact three-digit code that exists
 * is returned first and ignores the category filter, so typing "404" jumps to it.
 */
export function searchStatuses(
	list: readonly HttpStatus[],
	query: string,
	locale: Locale,
	categories: readonly StatusCategory[] = CATEGORIES
): HttpStatus[] {
	const needle = normalize(query);
	const exact = /^\d{3}$/.test(needle) ? list.find((entry) => String(entry.code) === needle) : undefined;
	const result: HttpStatus[] = [];
	if (exact !== undefined) {
		result.push(exact);
	}
	for (const entry of list) {
		if (entry === exact || !categories.includes(entry.category)) {
			continue;
		}
		if (needle === '') {
			result.push(entry);
			continue;
		}
		if (/^\d+$/.test(needle)) {
			if (String(entry.code).startsWith(needle)) {
				result.push(entry);
			}
			continue;
		}
		const haystack = normalize(`${entry.code} ${entry.name} ${entry.description[locale]}`);
		if (haystack.includes(needle)) {
			result.push(entry);
		}
	}
	return result;
}
