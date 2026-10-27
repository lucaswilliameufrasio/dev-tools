# JSON para código

**O que o usuário faz:** cola um JSON e recebe tipos/structs/classes para a linguagem escolhida.

**Como chegar:** `/jsontypes`.

**Como dirigir:** `e2e/flows.spec.ts`, bloco "json to code": `#jsontypes-language` (valores `typescript`, `go`, `rust`, `dart`, `kotlin`, `swift`, `csharp`, `java`, `python`, `zod`, `jsonschema`), saída em `#jsontypes-output`. O exemplo já vem carregado.

**Estado final que prova:** cada linguagem emite o construto esperado (por exemplo `type Root struct`, `data class Root`, `z.object`, `"$schema"`).

**Gotchas:** selecione pelo **valor** da opção (`selectOption('go')`). O teste confere o formato geral, não o código completo; a saída exata de cada linguagem é coberta por testes unitários em `src/lib/tools/jsontypes`.
