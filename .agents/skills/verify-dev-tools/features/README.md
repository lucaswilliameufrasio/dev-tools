# Mapa de funcionalidades verificáveis

Cobertura **parcial**: cinco jornadas de maior valor. As demais ferramentas têm testes unitários e entram no teste de privacidade (zero requisição externa), mas não têm jornada própria.

| Funcionalidade | Arquivo | Prova automatizada |
| --- | --- | --- |
| Encontrar e usar o Base64 (caso de origem do projeto) | [base64-quick-encode.md](base64-quick-encode.md) | `e2e/journeys.spec.ts` |
| Nenhum dado sai do navegador | [privacy-no-external-requests.md](privacy-no-external-requests.md) | `e2e/privacy.spec.ts` + log da jornada Base64 |
| Funcionar offline (PWA) | [offline-pwa.md](offline-pwa.md) | `e2e/journeys.spec.ts` |
| Hashes lentos em worker/WebAssembly | [slow-hashes-worker.md](slow-hashes-worker.md) | `e2e/tools.spec.ts` |
| JSON para código (11 linguagens) | [json-to-code.md](json-to-code.md) | `e2e/tools.spec.ts` |

Comando único: `pnpm build && pnpm test:e2e`. Evidências em `verification-artifacts/`.
