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

