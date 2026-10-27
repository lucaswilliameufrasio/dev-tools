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
3. Inclua `<id>` em `ToolId` e em `TOOLS` no `registry.ts` (id, grupo, glifo e palavras-chave de busca).
4. Crie a rota `src/routes/<id>/+page.svelte` (copie a de outra ferramenta: ela importa o componente e o envolve em `ToolPage`). Uma rota por ferramenta é proposital: cada página carrega só o próprio JS e CSS e já vem renderizada no HTML.
5. Crie `messages.ts` com `defineMessages` (`tool.<id>.name`, `tool.<id>.desc` e os demais textos, em pt e en) e importe-o em `src/lib/i18n/catalog.ts`.
6. Rode `pnpm test`, `pnpm check`, `pnpm build` e `pnpm test:e2e`: o teste de privacidade cobre toda rota registrada.

## Desempenho

Medido com Lighthouse 13.5 contra `wrangler pages dev` (cabeçalhos reais do Cloudflare), em 6 rotas:

| | Desktop | Celular (4G lento simulado) |
| --- | --- | --- |
| Performance | 99–100 | 91–99 |
| Acessibilidade, Boas práticas, SEO | 100 | 100 |
| CLS | 0 | 0 |
| LCP | 0,4–0,8 s | 1,9–2,8 s |

Cada página transfere cerca de 160–280 KiB, a maior parte fontes e o JavaScript da própria ferramenta.

**Custo do WebAssembly** (`node scripts/perf/measure-wasm.mjs`, máquina Apple Silicon, mediana de 3 execuções):

- O WebAssembly vem embutido nos workers: `argon2` 12 KiB e `bcrypt` 11 KiB em gzip. Só são buscados quando a ferramenta é usada.
- Partida a frio (worker + compilação do wasm): ~6–10 ms.
- argon2id com os mínimos da OWASP (19 MiB, t=2, p=1): ~30 ms nos três navegadores, contra 16 ms do argon2 nativo do Node. Com 64 MiB, t=3, p=4: ~120 ms contra 29 ms nativo, porque o wasm roda em uma única thread.
- bcrypt: custo 10 em ~65 ms, custo 12 em ~240 ms.
- A thread principal não trava: o maior intervalo entre quadros durante o cálculo foi de ~17–18 ms (um quadro a 60 Hz).

Em celulares esses tempos são maiores (da ordem de 3 a 6 vezes); não foram medidos em aparelho real.

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
