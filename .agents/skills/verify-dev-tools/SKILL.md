---
name: verify-dev-tools
description: Verifica o app dev-tools (SvelteKit estático + PWA, tudo no navegador) dirigindo o build de produção real com Playwright e guardando evidências. Use depois de mudar ferramentas, rotas, service worker, CSP ou i18n, e antes de declarar uma entrega pronta.
---

# Verificar o dev-tools

Superfície: app web (SvelteKit 3, `adapter-static`, PWA com service worker próprio). Não há backend nem banco; o estado do usuário é só `localStorage` (`dev-tools:locale`, `dev-tools:theme`) e o cache do service worker. A garantia central do produto é que **nenhum dado sai do navegador**.

Este skill complementa `pnpm test` (lógica pura) e `pnpm check`. Ele prova jornadas pelo app real rodando em produção local.

## Launch

Pré-requisitos: versões de `mise.toml` (`mise install`), `pnpm install`, Chromium do Playwright (`pnpm exec playwright install chromium`).

O E2E sempre serve `build/`, nunca o código-fonte. Portanto:

```sh
pnpm build                 # obrigatório se o build não existir ou estiver velho (ver Preflight)
pnpm test:e2e              # sobe `vite preview` na porta 4399 (strictPort, sem reaproveitar servidor) e encerra ao terminar
```

O próprio Playwright (`playwright.config.ts`, `webServer`) inicia e encerra o servidor. Para dirigir à mão (navegador MCP, curl), suba outro servidor em porta própria:

```sh
pnpm exec vite preview --port 4398 --strictPort > /tmp/dev-tools-preview.log 2>&1 &
sleep 3
PID=$(lsof -ti tcp:4398 -sTCP:LISTEN)          # PID que ESTE comando criou
lsof -p "$PID" | grep -q "$(pwd)" && echo "dono: este repositório"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4398/base64   # 200 = pronto
```

Teardown: `kill "$PID"` somente desse PID. Nunca use `pkill`/`killall` por nome: a máquina costuma ter outros servidores de desenvolvimento (já houve um projeto Astro na 4321).

## Preflight (somente leitura)

Rode antes de dirigir:

```sh
test -f build/_app/version.json || echo "SEM BUILD: rode pnpm build"
find src static vite.config.ts -newer build/_app/version.json -type f | head -3   # qualquer saída = build velho
lsof -nP -iTCP:4399 -sTCP:LISTEN && echo "PORTA 4399 OCUPADA por outro processo: diagnostique, não reaproveite"
mise exec -- node -v && mise exec -- pnpm -v   # 24.22.1 e 12.15.0
```

Se o build estiver velho ou ausente, rode `pnpm build` e repita. Se a porta estiver ocupada, descubra o dono com `lsof` e use outra; não dirija uma instância desconhecida.

## Drive

- Rotas: `/` e `/<id>` para cada id em `src/lib/tools/registry.ts` (31 no total).
- Seletores estáveis: ids de campo por ferramenta (`#b64-input`, `#b64-output`, `#json-input`, `#json-output`, `#bcrypt-password`, `#argon2-encoded`, `#jsontypes-language`, `#cron-expr`, `#palette-search`…), papéis e nomes acessíveis (`getByRole('radio', { name: 'Decode' })`, `getByRole('button', { name: 'Language' })`).
- O Chromium headless usa `en-US`, então a interface começa em inglês; o botão de idioma alterna para `pt-BR`.
- **Aguarde a hidratação** antes de usar atalhos de teclado: `page.goto('/', { waitUntil: 'networkidle' })`. Sem isso `Ctrl/⌘ K` é ignorado.
- Service worker: o `playwright.config.ts` o bloqueia por padrão; os testes de PWA usam `test.use({ serviceWorkers: 'allow' })`.
- Specs existentes: `e2e/privacy.spec.ts` (todas as rotas, zero requisição externa, CSP), `e2e/tools.spec.ts` (bcrypt/argon2/regex/SQL/jsontypes/cron/QR/hash) e `e2e/journeys.spec.ts` (jornadas completas com evidência).

Mapa de funcionalidades: `features/README.md`.

## Evidence

Diretório: `verification-artifacts/` (ignorado pelo git; sobrevive ao teardown). Escrito por `e2e/journeys.spec.ts`:

- `base64-encode.png`, `base64-decode.png`: ação e estado resultante.
- `base64-network-log.json`: toda requisição da jornada; prova que nenhuma saiu da origem.
- `json-offline.png`: ferramenta usada com a rede desligada.

Prova suficiente = o teste passou **e** os artefatos existem **e** a lista de requisições externas está vazia. Screenshot sozinho não basta; verifique também o valor dos campos (`toHaveValue`) e o `localStorage`.

## Isolamento e limpeza

- O verificador cria apenas: `build/` (regenerável), `verification-artifacts/`, `test-results/`, `playwright-report/` e, na condução manual, o servidor da porta 4398 e `/tmp/dev-tools-preview.log`. Remova somente isso.
- Cada teste usa um contexto novo do Playwright (sem `localStorage`/cache compartilhado). Não rode dois `pnpm test:e2e` ao mesmo tempo: a porta 4399 é fixa.
- Não há efeitos externos: nenhum serviço remoto, e-mail, pagamento ou deploy.

## Failure handling

- **`SEM BUILD`/build velho:** falta setup, não defeito. Rode `pnpm build`.
- **Porta ocupada / `strictPort` falhou:** processo de terceiros. Identifique com `lsof`; não mate nem reaproveite.
- **Heading ou campo "not found" logo após `goto`:** quase sempre hidratação. Use `waitUntil: 'networkidle'`.
- **Offline mostra "Tool not found" ou módulo dinâmico falha:** defeito real do service worker (já ocorreu: caminhos do manifesto sem `/` inicial, `Vary: Origin` no `cache.match`, `_headers` no precache). Leia `src/service-worker.ts`; não enfraqueça o teste.
- **Requisição externa registrada:** defeito de privacidade. Veja a URL em `base64-network-log.json` ou no relatório; não adicione o host a nenhuma lista de permitidos.
- **Chromium ausente:** `pnpm exec playwright install chromium`.
- Registre o erro real; não reduza a jornada para passar.

## Manutenção

Atualize `features/` e os seletores acima quando mudarem rotas, ids de campo, textos usados como nome acessível, o service worker ou o CSP. Ao adicionar uma ferramenta, `e2e/privacy.spec.ts` já a cobre pelo registro; acrescente uma jornada em `e2e/journeys.spec.ts` se ela tiver fluxo próprio relevante. Este mapa cobre algumas jornadas, não todas as 30 ferramentas.
