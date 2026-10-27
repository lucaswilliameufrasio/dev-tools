# dev-tools

Ferramentas do dia a dia para quem programa. Tudo roda no navegador: nenhum dado digitado sai da sua máquina.

Interface em português (BR) e inglês. Funciona offline como PWA depois do primeiro acesso.

## Ferramentas

| Grupo | Ferramentas |
| --- | --- |
| Converter | Base64 (texto, arquivos, Base64URL), URL encode, bases numéricas, estilos de texto, cores (com contraste), timestamp, JSON/YAML/TOML/CSV, escape e unescape (HTML, JSON, JS, Unicode, XML, CSV), imagem (data URI, converter, comprimir), linhas (ordenar, deduplicar, slug…) |
| Inspecionar | JSON, regex (em worker com timeout), diff de texto, cron (explicação e próximas execuções), inspetor Unicode |
| Segurança | JWT (decodificar, verificar e assinar HS/RS/PS/ES), hash e HMAC (MD5, SHA-1/256/384/512), bcrypt, argon2 (id/i/d, WebAssembly em worker), senhas |
| Gerar | UUID v4/v7 e ULID, QR code (gerar e ler) |
| Dados de teste | CPF e CNPJ (inclusive alfanumérico), placas (antiga e Mercosul), cartões fictícios (Luhn) |
| Código | JSON para tipos (TypeScript, Go, Rust, Dart, Kotlin, Swift, C#, Java, Python, Zod, JSON Schema), formatador de SQL |
| Referência | calculadora CIDR (IPv4/IPv6), chmod/umask, códigos HTTP |

Aperte `Ctrl/⌘ K` em qualquer tela para buscar uma ferramenta.

## Privacidade

- Não há backend, análise de uso nem cookies.
- Hash e HMAC usam a Web Crypto API (MD5 tem implementação própria, pois a API não o oferece); UUID, ULID e senhas usam `crypto.getRandomValues`.
- O CSP (`default-src 'none'`, `connect-src 'self'`) faz o navegador bloquear qualquer requisição para fora da própria origem.
- Para conferir: abra a aba Rede nas ferramentas do desenvolvedor e use qualquer ferramenta.

## Desenvolvimento

Versões fixadas: Node 24.22.1 (LTS Krypton) e pnpm 12.15.0. Com [mise](https://mise.jdx.dev), rode `mise install` (lê `mise.toml`). Sem mise, `.nvmrc`/`.node-version` servem para nvm/fnm e `corepack enable` cuida do pnpm.

```sh
pnpm install
pnpm dev        # servidor local
pnpm test       # testes unitários da lógica das ferramentas
pnpm test:e2e   # Playwright (chromium, firefox, webkit, celular): privacidade, fluxos de cada ferramenta, PWA offline, layout e acessibilidade; rode `pnpm build` antes
pnpm check      # svelte-check
pnpm build      # gera ./build (site estático)
pnpm preview    # serve ./build
```

Fontes (IBM Plex Sans e JetBrains Mono) são servidas pelo próprio site via `@fontsource`, sem CDN.

Stack: SvelteKit com `adapter-static` (todas as rotas pré-renderizadas), Svelte 5, TypeScript, Vitest. O service worker é o nativo do SvelteKit (`src/service-worker.ts`).

### Estrutura

- `src/lib/tools/<ferramenta>/`: lógica pura em `.ts` (com testes), a tela em `.svelte` e os textos em `messages.ts`.
- `src/lib/tools/registry.ts`: lista de ferramentas, grupos e palavras-chave de busca.
- `src/lib/i18n/`: textos do app em `pt.ts` e `en.ts`; os de cada ferramenta nova ficam no `messages.ts` dela e são reunidos em `catalog.ts` (o TypeScript exige as mesmas chaves em pt e en).
- `src/lib/ui/`: componentes compartilhados (paleta de comandos, botão de copiar etc.).
- `assets/logo.svg`: fonte do logo. Os ícones PNG em `static/` foram gerados dela com `@vite-pwa/assets-generator`.

### Adicionar uma ferramenta

1. Crie `src/lib/tools/<id>/<id>.ts` com a lógica e `<id>.test.ts`.
2. Crie o componente `.svelte` ao lado.
3. Inclua `<id>` em `ToolId` e em `TOOLS` no `registry.ts`.
4. Crie `messages.ts` com `defineMessages` (`tool.<id>.name`, `tool.<id>.desc` e os demais textos, em pt e en) e importe-o em `src/lib/i18n/catalog.ts`.
5. Rode `pnpm test`, `pnpm check`, `pnpm build` e `pnpm test:e2e`: o teste de privacidade cobre toda rota registrada.

## Skills de IA

O repositório traz skills de design, UX e Svelte em `.agents/skills/`, com links simbólicos em `.claude/skills/` para o Claude Code. Instale outras com `npx skills add`. Veja `AGENTS.md`.

## Deploy no Cloudflare Pages

No painel (Workers & Pages > Create > Pages > Connect to Git), escolha este repositório e use:

- Build command: `pnpm build`
- Build output directory: `build` (também definido em `wrangler.jsonc`, que prevalece sobre o preset "SvelteKit" do painel; esse preset procura `.svelte-kit/cloudflare`, que só existe com `adapter-cloudflare`)
- Variável de ambiente `NODE_VERSION`: `24.22.1` (o Pages também lê `.node-version`)

O arquivo `static/_headers` define os cabeçalhos de segurança e o cache dos assets.

## Licença

MIT
