# dev-tools

Ferramentas do dia a dia para quem programa. Tudo roda no navegador: nenhum dado digitado sai da sua máquina.

Interface em português (BR) e inglês. Funciona offline como PWA depois do primeiro acesso.

## Ferramentas

| Grupo | Ferramentas |
| --- | --- |
| Converter | Base64 (texto, arquivos, Base64URL), URL encode, bases numéricas, estilos de texto (camel, snake…), cores (HEX/RGB/HSL e contraste), timestamp |
| Inspecionar | JSON (formatar, minificar, validar), JWT (decodificação), Regex (com worker e timeout), diff de texto |
| Gerar | Hash e HMAC (MD5/SHA-1/256/384/512), UUID v4/v7 e ULID, senhas |

Aperte `Ctrl/⌘ K` em qualquer tela para buscar uma ferramenta.

## Privacidade

- Não há backend, análise de uso nem cookies.
- Hash e HMAC usam a Web Crypto API (MD5 tem implementação própria, pois a API não o oferece); UUID, ULID e senhas usam `crypto.getRandomValues`.
- O CSP (`default-src 'none'`, `connect-src 'self'`) faz o navegador bloquear qualquer requisição para fora da própria origem.
- Para conferir: abra a aba Rede nas ferramentas do desenvolvedor e use qualquer ferramenta.

## Desenvolvimento

Versões fixadas: Node 24.22.1 (LTS Krypton) e pnpm 12.15.0. Use `nvm use` (ou fnm/mise, que leem `.nvmrc`/`.node-version`) e `corepack enable` para pegar as versões certas.

```sh
pnpm install
pnpm dev        # servidor local
pnpm test       # testes unitários da lógica das ferramentas
pnpm check      # svelte-check
pnpm build      # gera ./build (site estático)
pnpm preview    # serve ./build
```

Fontes (IBM Plex Sans e JetBrains Mono) são servidas pelo próprio site via `@fontsource`, sem CDN.

Stack: SvelteKit com `adapter-static` (todas as rotas pré-renderizadas), Svelte 5, TypeScript, Vitest. O service worker é o nativo do SvelteKit (`src/service-worker.ts`).

### Estrutura

- `src/lib/tools/<ferramenta>/`: lógica pura em `.ts` (com testes) e a tela em `.svelte`.
- `src/lib/tools/registry.ts`: lista de ferramentas, grupos e palavras-chave de busca.
- `src/lib/i18n/`: textos em `pt.ts` e `en.ts` (o TypeScript exige as mesmas chaves nos dois).
- `src/lib/ui/`: componentes compartilhados (paleta de comandos, botão de copiar etc.).
- `assets/logo.svg`: fonte do logo. Os ícones PNG em `static/` foram gerados dela com `@vite-pwa/assets-generator`.

### Adicionar uma ferramenta

1. Crie `src/lib/tools/<id>/<id>.ts` com a lógica e `<id>.test.ts`.
2. Crie o componente `.svelte` ao lado.
3. Inclua `<id>` em `ToolId` e em `TOOLS` no `registry.ts`.
4. Adicione `tool.<id>.name` e `tool.<id>.desc` (e os demais textos) em `pt.ts` e `en.ts`.

## Skills de IA

O repositório traz skills para o Claude Code em `.claude/skills/` (design, UX e Svelte). Veja `CLAUDE.md`.

## Deploy no Cloudflare Pages

No painel (Workers & Pages > Create > Pages > Connect to Git), escolha este repositório e use:

- Build command: `pnpm build`
- Build output directory: `build`
- Variável de ambiente `NODE_VERSION`: `24.22.1` (o Pages também lê `.node-version`)

O arquivo `static/_headers` define os cabeçalhos de segurança e o cache dos assets.

## Licença

MIT
