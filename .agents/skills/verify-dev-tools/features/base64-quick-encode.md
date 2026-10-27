# Base64: achar a ferramenta e codificar

**O que o usuário faz:** abre o app, aperta `Ctrl/⌘ K`, digita `b64`, Enter, escreve um texto e copia o Base64; troca para Decode e volta; troca o idioma e ele é lembrado.

**Como chegar:** `/` → paleta (`#palette-search`) → `/base64`.

**Como dirigir:** `e2e/journeys.spec.ts`, teste "journey: find Base64 from the palette…". Campos: `#b64-input`, `#b64-output`, rádio `Decode`, botão `Language`.

**Estado final que prova:**
- URL termina em `/base64` e o `h1` é "Base64".
- `#b64-output` igual a `Buffer.from('Olá, mundo! 👋').toString('base64')`; no modo Decode o resultado volta ao texto original.
- `html[lang="pt-BR"]` após alternar o idioma **e** após `reload`; `localStorage['dev-tools:locale'] === 'pt'`.
- `verification-artifacts/base64-network-log.json` sem nenhuma entrada com `sameOrigin: false`.

**Gotchas:** aguardar hidratação (`networkidle`) antes do atalho de teclado; os rádios do `Segmented` são invisíveis, use `check({ force: true })`.
