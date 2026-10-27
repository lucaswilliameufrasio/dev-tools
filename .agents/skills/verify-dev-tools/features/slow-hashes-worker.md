# bcrypt e argon2 em worker/WebAssembly

**O que o usuário faz:** gera um hash bcrypt ou argon2 localmente, com a página continuando utilizável, e pode cancelar.

**Como chegar:** `/bcrypt`, `/argon2`.

**Como dirigir:** `e2e/tools.spec.ts`. bcrypt: `#bcrypt-password`, `#bcrypt-cost` = 4, botão "Generate hash". argon2: `#argon2-password`, `#argon2-memory` = 64, botão "Generate hash".

**Estado final que prova:** `#bcrypt-output` casa `/^\$2b\$04\$/`; `#argon2-encoded` casa `/^\$argon2id\$v=19\$m=64,/`.

**Gotchas:** custos altos demoram; os testes usam parâmetros mínimos. Verificação (modo "Verify") e cancelamento não têm jornada automatizada: não afirme que estão cobertos.
