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

O próprio Playwright (`playwright.config.ts`, `webServer`) inicia e encerra o servidor.

**Ambiente mais próximo da produção:** `wrangler pages dev` serve `build/` com o `_headers` e o `wrangler.jsonc` reais do Cloudflare. Rode a mesma suíte contra ele com `E2E_BASE_URL`:

```sh
npx --yes wrangler@latest pages dev --port 8788 --ip 127.0.0.1 > /tmp/wrangler-dev.log 2>&1 &
sleep 25 && curl -sI http://127.0.0.1:8788/base64 | grep -i content-security-policy   # cabeçalhos do _headers
E2E_BASE_URL=http://127.0.0.1:8788 pnpm exec playwright test
PID=$(lsof -ti tcp:8788 -sTCP:LISTEN); lsof -p "$PID" | grep cwd   # confirme que é este repositório
kill "$PID"                                                       # e encerre também o `npm exec` que você iniciou
```

O mesmo `E2E_BASE_URL` serve para testar uma URL de preview do Cloudflare depois de um deploy.

Para dirigir à mão (navegador MCP, curl), suba outro servidor em porta própria:

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
- Specs (`pnpm test:e2e` roda tudo, em chromium, firefox, webkit e, para o layout, Pixel 7 e iPhone 14):
  - `privacy.spec.ts`: todas as rotas, zero requisição externa, CSP.
  - `journeys.spec.ts`: jornada Base64 (paleta, codificar, decodificar, idioma) e PWA offline, com evidência.
  - `flows.spec.ts`: um fluxo funcional por ferramenta (bcrypt/argon2 gerar, verificar e cancelar; JWT assinar/verificar; as 11 linguagens do JSON; QR gerar e ler o PNG de volta; imagem; conversores e geradores).
  - `tools.spec.ts`: smoke de worker, WebAssembly e carregamento lazy.
  - `layout.spec.ts`: sem rolagem horizontal em claro e escuro, desktop e celular; paleta usável.
  - `a11y.spec.ts`: axe (WCAG 2 A/AA) em todas as rotas, claro e escuro, só no Chromium; falha em impacto serious/critical.

Mapa de funcionalidades: `features/README.md`.

## Evidence

Diretório: `verification-artifacts/` (ignorado pelo git; sobrevive ao teardown). Escrito por `e2e/journeys.spec.ts`:

- `base64-encode.png`, `base64-decode.png`: ação e estado resultante.
- `base64-network-log.json`: toda requisição da jornada; prova que nenhuma saiu da origem.
- `json-offline.png`: ferramenta usada com a rede desligada.
- `layout/<projeto>-<tema>-<rota>.png`: telas de todas as rotas em celular, claro e escuro. Olhe algumas: o teste mede overflow, não beleza (foi assim que se achou o cabeçalho quebrando em duas linhas).

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

Atualize `features/` e os seletores acima quando mudarem rotas, ids de campo, textos usados como nome acessível, o service worker ou o CSP. Ao adicionar uma ferramenta, `e2e/privacy.spec.ts` já a cobre pelo registro; acrescente uma jornada em `e2e/journeys.spec.ts` se ela tiver fluxo próprio relevante. O mapa de `features/` cobre as jornadas principais; as demais ferramentas têm um fluxo em `flows.spec.ts` e testes unitários, mas não uma jornada documentada.
