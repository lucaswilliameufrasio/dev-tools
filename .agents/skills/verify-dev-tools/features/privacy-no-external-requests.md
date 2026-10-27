# Privacidade: nenhuma requisição externa

**Promessa do produto:** nada do que o usuário digita sai do navegador.

**Como dirigir:** `e2e/privacy.spec.ts` percorre `/` e cada rota do `registry.ts`, intercepta tudo com `context.route('**/*')` e registra qualquer URL de outra origem (e a aborta). Também confere a meta CSP (`default-src 'none'`, `connect-src 'self'`).

**Estado final que prova:** para cada rota, lista de requisições externas vazia e nenhum `pageerror`. 32 testes (31 rotas + CSP).

**Gotchas:** o teste precisa rodar contra **este** build na porta 4399. Se a porta estiver ocupada por outro app, os resultados são inválidos (já aconteceu com um servidor Astro na 4321); por isso `reuseExistingServer` é `false`.
