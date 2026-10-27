# dev-tools

Ferramentas de programador que rodam 100% no navegador (SvelteKit estático, PWA, Cloudflare Pages).

## Regras do projeto

- Nenhum dado do usuário sai do navegador. Não adicione requisições externas, analytics, CDNs de fontes ou scripts de terceiros. O CSP (`vite.config.ts`) usa `connect-src 'self'` e não deve ser afrouxado.
- Node e pnpm estão fixados em `package.json`, `.nvmrc` e `.node-version`. Atualize os três juntos.
- Imports usam o alias `#lib/...`. Arquivos `.ts` entram com extensão `.js` (por exemplo `#lib/tools/registry.js`).
- Cada ferramenta tem lógica pura em `.ts` com teste, e a tela em `.svelte`. Veja o README para adicionar uma.
- Textos ficam em `src/lib/i18n/pt.ts` e `en.ts`, sempre com as mesmas chaves.
- Estilo de código: `if`/`for` sempre com chaves e várias linhas, sem `forEach`, `undefined` em vez de `null`, sem `any` nem `as`.
- Antes de concluir: `pnpm test`, `pnpm check` e `pnpm build`.

## Skills do repositório (`.claude/skills/`)

- `ui-ux-pro-max`: busca local de estilos, paletas, tipografia e regras de UX. Rode `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --design-system`. Use as sugestões como ponto de partida; descarte o que exigir recurso externo.
- `frontend-design` (Anthropic): processo de direção visual para evitar aparência genérica.
- `svelte-core-bestpractices` e `svelte-code-writer` (time do Svelte): boas práticas de Svelte 5. O `svelte-code-writer` executa `npx @sveltejs/mcp` para consultar a documentação.
