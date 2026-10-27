# dev-tools

Ferramentas de programador que rodam 100% no navegador (SvelteKit estático, PWA, Cloudflare Pages).

## Regras do projeto

- Nenhum dado do usuário sai do navegador. Não adicione requisições externas, analytics, CDNs de fontes ou scripts de terceiros. O CSP (`vite.config.ts`) usa `connect-src 'self'` e não deve ser afrouxado.
- Node e pnpm estão fixados em `mise.toml`, `package.json`, `.nvmrc` e `.node-version`. Atualize os quatro juntos.
- Imports usam o alias `#lib/...`. Arquivos `.ts` entram com extensão `.js` (por exemplo `#lib/tools/registry.js`).
- Cada ferramenta tem lógica pura em `.ts` com teste, a tela em `.svelte` e uma rota própria em `src/routes/<id>/+page.svelte` (não volte a uma rota dinâmica única: ela faz toda página carregar o CSS e o JS de todas as ferramentas). `registry.test.ts` confere que toda ferramenta tem rota e textos. Veja o README para adicionar uma.
- As páginas são pré-renderizadas com o conteúdo da ferramenta. Nos testes E2E use `open(page, path)` (espera a hidratação) em vez de `page.goto`.
- Textos do app ficam em `src/lib/i18n/pt.ts` e `en.ts`; os de cada ferramenta nova ficam em `messages.ts` na pasta dela (via `defineMessages`, registrado em `src/lib/i18n/catalog.ts`). Sempre as mesmas chaves em pt e en.
- Estilo de código: `if`/`for` sempre com chaves e várias linhas, sem `forEach`, `undefined` em vez de `null`, sem `any` nem `as`.
- Antes de concluir: `pnpm test`, `pnpm check`, `pnpm build` e `pnpm test:e2e` (o E2E usa o build; a porta é dedicada e nunca reaproveita outro servidor; `E2E_BASE_URL` aponta a suíte para `wrangler pages dev` ou um preview do Cloudflare). O E2E cobre chromium, firefox, webkit, layout em celular e acessibilidade (axe).

## Skills do repositório

Instaladas com `npx skills add <repo> --skill <nome> -y` (exceto `verify-dev-tools`, que é do projeto e não está em `skills-lock.json`). Os arquivos ficam em `.agents/skills/` (registrados em `skills-lock.json`) e `.claude/skills/` contém só links simbólicos. Não edite os arquivos das skills; `npx skills update` os sobrescreve.

- `ui-ux-pro-max`: busca local de estilos, paletas, tipografia e regras de UX. Rode `python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --design-system`. O `SKILL.md` cita `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max`: neste repositório esse caminho é `.agents/skills/ui-ux-pro-max`. Use as sugestões como ponto de partida e descarte o que exigir recurso externo.
- `verify-dev-tools` (do projeto): como subir o build de produção, dirigir as jornadas com Playwright e guardar evidências em `verification-artifacts/`. Use antes de dar uma entrega como pronta; mantenha `features/` atualizado quando mudarem rotas, ids de campo, service worker ou CSP.
- `frontend-design` (Anthropic): processo de direção visual para evitar aparência genérica.
- `svelte-core-bestpractices` e `svelte-code-writer` (time do Svelte): boas práticas de Svelte 5. O `svelte-code-writer` executa `npx @sveltejs/mcp` para consultar a documentação.
