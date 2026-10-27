# Layout e acessibilidade

**O que o usuário espera:** usar qualquer ferramenta em celular ou desktop, no tema claro ou escuro, sem rolagem horizontal e com contraste e nomes acessíveis.

**Como dirigir:** `e2e/layout.spec.ts` (todos os projetos, incl. Pixel 7 e iPhone 14) e `e2e/a11y.spec.ts` (axe, WCAG 2 A/AA, só Chromium). Ambos percorrem `/` e cada rota do `registry.ts`, em claro e escuro.

**Estado final que prova:** `scrollWidth - clientWidth <= 0` em cada rota/tema; nenhuma violação axe de impacto serious/critical. Evidência visual em `verification-artifacts/layout/` (Pixel 7).

**Gotchas:** o teste de overflow não vê quebra de linha feia nem hierarquia ruim; abra alguns screenshots. Defeitos reais já achados por estes testes: contraste do `.pill.ghost` no Unicode, tabela do diff sem células, amostras de cor com texto ilegível, cabeçalho do celular quebrando em duas linhas.
