# JSON para código

**O que o usuário faz:** cola um JSON e recebe tipos/structs/classes para a linguagem escolhida.

**Como chegar:** `/jsontypes`.

**Como dirigir:** `e2e/tools.spec.ts`: `#jsontypes-language` (valores `go`, `rust`, `typescript`…), saída em `#jsontypes-output`. O exemplo já vem carregado.

**Estado final que prova:** Go contém `type Root struct`; Rust contém `#[derive(… Serialize …)]`.

**Gotchas:** selecione a linguagem pelo **valor** da opção (`selectOption('go')`), não por regex de rótulo. Só Go e Rust têm jornada automatizada; as outras linguagens são cobertas por testes unitários de emissão.
