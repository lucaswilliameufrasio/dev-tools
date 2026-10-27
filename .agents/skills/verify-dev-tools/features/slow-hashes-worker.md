# bcrypt e argon2 em worker/WebAssembly

**O que o usuário faz:** gera um hash bcrypt ou argon2 localmente, verifica uma senha contra um hash e cancela um cálculo lento, com a página sempre utilizável.

**Como chegar:** `/bcrypt`, `/argon2`.

**Como dirigir:** `e2e/flows.spec.ts` (bloco "slow hashes"). bcrypt: `#bcrypt-password`, `#bcrypt-cost`, `#bcrypt-hash`, botões "Generate hash"/"Verify"/"Cancel", rádio `Verify`. argon2: `#argon2-password`, `#argon2-memory`, `#argon2-iterations`, `#argon2-hash`, `#argon2-encoded`.

**Estado final que prova:**
- Gerar: `#bcrypt-output` casa `/^\$2b\$04\$/`; `#argon2-encoded` casa `/^\$argon2id\$/`.
- Verificar: "The password matches the hash." com a senha certa e "The password does NOT match the hash." com a errada.
- Cancelar (bcrypt custo 15; argon2 256 MiB × 60 passes): aparece "Computation cancelled." e o campo de senha volta a ficar habilitado.

**Gotchas:** custos altos são lentos de propósito, e por isso servem para o teste de cancelamento. Os testes de geração usam parâmetros mínimos.
