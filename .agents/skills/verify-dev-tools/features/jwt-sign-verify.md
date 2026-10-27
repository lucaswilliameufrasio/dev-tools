# JWT: assinar e verificar

**O que o usuário faz:** assina um token HS256 com um segredo, verifica a assinatura e vê uma adulteração ser rejeitada.

**Como chegar:** `/jwt`, rádios `Sign` / `Verify` / `Decode`.

**Como dirigir:** `e2e/flows.spec.ts`, teste "jwt: sign with HS256…": `#jwts-key`, `#jwts-output`, `#jwt-input`, `#jwtv-key`.

**Estado final que prova:** `#jwts-output` começa com `eyJ`; ao verificar com o mesmo segredo aparece "Valid signature"; com outro segredo, "Invalid signature".

**Gotchas:** só HS256 tem jornada automatizada. RS/PS/ES e os erros de chave são cobertos por testes unitários (`jwtCrypto.test.ts`, incluindo o vetor da RFC 7515 A.1).
