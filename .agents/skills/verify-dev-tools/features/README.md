# Mapa de funcionalidades verificáveis

Jornadas principais. As demais ferramentas têm um fluxo em `e2e/flows.spec.ts` e testes unitários, mas não uma jornada documentada aqui.

| Funcionalidade | Arquivo | Prova automatizada |
| --- | --- | --- |
| Encontrar e usar o Base64 (caso de origem do projeto) | [base64-quick-encode.md](base64-quick-encode.md) | `e2e/journeys.spec.ts` |
| Nenhum dado sai do navegador | [privacy-no-external-requests.md](privacy-no-external-requests.md) | `e2e/privacy.spec.ts` + log da jornada Base64 |
| Funcionar offline (PWA) | [offline-pwa.md](offline-pwa.md) | `e2e/journeys.spec.ts` |
| Hashes lentos em worker/WebAssembly (gerar, verificar, cancelar) | [slow-hashes-worker.md](slow-hashes-worker.md) | `e2e/flows.spec.ts` |
| JWT assinar e verificar | [jwt-sign-verify.md](jwt-sign-verify.md) | `e2e/flows.spec.ts` |
| QR: gerar PNG e ler de volta | [qr-roundtrip.md](qr-roundtrip.md) | `e2e/flows.spec.ts` |
| JSON para código (11 linguagens) | [json-to-code.md](json-to-code.md) | `e2e/flows.spec.ts` |
| Layout e acessibilidade em todas as rotas | [layout-and-accessibility.md](layout-and-accessibility.md) | `e2e/layout.spec.ts`, `e2e/a11y.spec.ts` |

Comando único: `pnpm build && pnpm test:e2e`. Evidências em `verification-artifacts/`.
