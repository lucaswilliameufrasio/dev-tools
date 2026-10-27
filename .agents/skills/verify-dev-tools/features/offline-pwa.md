# PWA offline

**O que o usuário faz:** visita o app uma vez; depois, sem rede, abre uma ferramenta e a usa.

**Como dirigir:** `e2e/journeys.spec.ts`, bloco "offline PWA" (`serviceWorkers: 'allow'`): `goto('/')` → espera `navigator.serviceWorker.ready` → `reload` (para o worker controlar a página) → `context.setOffline(true)` → `goto('/json')` → usa `#json-input`.

**Estado final que prova:** com a rede desligada, o `h1` é "JSON", `#json-output` mostra o JSON formatado, sem "Tool not found". Evidência: `verification-artifacts/json-offline.png`.

**Gotchas (defeitos reais já encontrados em `src/service-worker.ts`):** os caminhos de `$app/manifest` vêm **sem `/` inicial** (home = `''`); `cache.match` precisa de `ignoreVary: true` (módulos ES levam `Origin` e o servidor responde `Vary: Origin`); `_headers` não é servido e derruba o `addAll` se entrar no precache.
