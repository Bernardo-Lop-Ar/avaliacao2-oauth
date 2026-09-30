## Caso 1 — Retorno sem cookie temporário

- **Preparação:** Iniciei o login com Google em uma janela normal e abri a URL de autorização em uma janela anônima sem o cookie temporário `__Host-oauth-tx`.
- **Pedido enviado:** Concluí a autenticação no Google na janela anônima, provocando o retorno para `/oauth/callback/google`, e consultei `/api/me`.
- **Resultado esperado:** O callback deveria recusar o retorno por ausência da transação válida e não criar uma sessão local.
- **Resultado observado:** O callback foi recusado e `/api/me` retornou HTTP 401. Nenhuma sessão autenticada foi criada na janela anônima.
- **Status:** APROVADO

- ## Caso 2 — State alterado

* **Preparação:** Encerrei a sessão anterior e confirmei que `/api/me` retornava HTTP 401. Iniciei um novo login com GitHub e alterei um caractere do parâmetro `state` antes de concluir o fluxo.
* **Pedido enviado:** A requisição de retorno chegou a `/oauth/callback/github` com os parâmetros `code` e `state`.
* **Resultado esperado:** O callback deveria rejeitar a divergência de `state` antes da troca do código por tokens, sem criar uma sessão local.
* **Resultado observado:** O callback retornou HTTP 400. O log registrou `GitHub callback: state mismatch`. Após a tentativa, `/api/me` retornou HTTP 401.
* **Status:** APROVADO

### Teste 3 — Reutilização da transação OAuth

- **Preparação:** Realizei um login válido com o Google e copiei a URL do callback da autenticação concluída.
- **Requisição enviada:** Reabri a mesma URL do callback em uma nova aba do navegador.
- **Resultado esperado:** O sistema deveria rejeitar a transação já utilizada, sem permitir sua reutilização.
- **Resultado observado:** O sistema exibiu “Authentication failed” e retornou HTTP 400. **Teste aprovado.**

- ### Teste 4 — Sessão expirada

- **Preparação:** Acessei o banco D1 vinculado ao projeto e executei `UPDATE sessions SET expires_at = 0;`.
- **Requisição enviada:** `GET https://avaliacao2-oauth.pages.dev/api/me`.
- **Resultado esperado:** A API deveria retornar HTTP `401 Unauthorized`, recusando a sessão expirada.
- **Resultado observado:** O SQL foi executado com sucesso e a API retornou HTTP `401 Unauthorized`. **Teste aprovado.**

- ### Teste 5 — Logout com Origin inválido

- **Preparação:** Mantive uma sessão autenticada no site e abri `https://example.com` em outra aba.
- **Requisição enviada:** `POST /oauth/logout`, iniciada a partir de `example.com`, com `credentials: "include"`.
- **Resultado esperado:** O servidor deveria recusar o logout por origem inválida e preservar a sessão legítima.
- **Resultado observado:** O navegador informou bloqueio CORS devido à ausência de `Access-Control-Allow-Origin`. Após retornar ao site original, `GET /api/me` retornou HTTP `200 OK`, confirmando que a sessão continuava válida. A rejeição pelo servidor deve ser confirmada separadamente.

### Teste 6 — Reutilização de cookie de sessão revogado

- **Preparação:** Copiei temporariamente o valor do cookie `__Host-session`, realizei logout e confirmei a remoção ou expiração do cookie.
- **Requisição enviada:** `GET /api/me`, enviando manualmente o cookie antigo por meio de uma requisição HTTP local.
- **Resultado esperado:** A API deveria rejeitar o cookie antigo e retornar HTTP `401 Unauthorized`, pois a sessão já havia sido revogada.
- **Resultado observado:** A API retornou `HTTP/1.1 401 Unauthorized`. **Teste aprovado.**
