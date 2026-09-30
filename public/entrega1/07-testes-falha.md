## Caso 1 — Retorno sem cookie temporário

- **Preparação:** Iniciei o login com Google em uma janela normal e abri a URL de autorização em uma janela anônima sem o cookie temporário `__Host-oauth-tx`.
- **Pedido enviado:** Concluí a autenticação no Google na janela anônima, provocando o retorno para `/oauth/callback/google`, e consultei `/api/me`.
- **Resultado esperado:** O callback deveria recusar o retorno por ausência da transação válida e não criar uma sessão local.
- **Resultado observado:** O callback foi recusado e `/api/me` retornou HTTP 401. Nenhuma sessão autenticada foi criada na janela anônima.
- **Status:** APROVADO
