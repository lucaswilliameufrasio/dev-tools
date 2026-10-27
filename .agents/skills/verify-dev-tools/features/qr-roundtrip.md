# QR: gerar e ler de volta

**O que o usuário faz:** gera um QR code, baixa o PNG e lê esse PNG de volta no próprio app.

**Como chegar:** `/qr` (padrão: gerar com o preset URL; rádio `Read` para ler).

**Como dirigir:** `e2e/flows.spec.ts`, teste "qr: a generated PNG is read back…": `#qr-url`, botão "PNG" (download), `input[type=file]` no modo Read, `#qr-decoded`.

**Estado final que prova:** o texto decodificado é idêntico ao digitado, com um PNG baixado de verdade pelo navegador.

**Gotchas:** o campo padrão é `#qr-url`; `#qr-text` só existe no preset Text. Colar e arrastar imagens não têm teste automatizado.
