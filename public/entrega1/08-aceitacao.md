# Checklist de aceitação — Avaliação 2 OAuth

**Projeto:** avaliacao2-oauth
**URL de produção:** https://avaliacao2-oauth.pages.dev
**Data da verificação:** 30/09/2026

## 1. Publicação e estrutura

* [x] O site é servido pelo endereço `pages.dev` atribuído ao projeto.
* [x] Os arquivos estáticos e as Pages Functions compartilham a mesma origem.
* [x] O projeto foi publicado por integração com GitHub.
* [x] A equipe não precisou instalar ou executar Node.js, npm, npx ou Wrangler.

## 2. Fluxos OAuth

* [x] Cada provedor usa uma URL de retorno própria.
* [x] Os pedidos de autorização usam Authorization Code e PKCE com método S256.
* [x] A Function apresenta o Client Secret correto somente durante a troca de tokens.
* [x] O retorno recusa uma transação ausente, alterada ou reutilizada.
* [x] O retorno também recusa transações expiradas.
* [x] O ID Token do Google é validado criptográfica e semanticamente antes da criação da sessão.
* [x] O access token do GitHub é usado para consultar `/user`, e a autorização é revogada antes da criação da sessão.

## 3. Sessão e banco D1

* [x] O cookie de sessão é opaco, Secure, HttpOnly, SameSite=Strict e não possui Domain.
* [x] O D1 guarda o resumo criptográfico do cookie de sessão, não seu valor bruto.
* [x] `/api/me` consulta a sessão e retorna o perfil necessário.
* [x] O logout confere o cabeçalho Origin, remove a sessão do D1 e expira o cookie.
* [x] Um cookie de sessão revogado não restaura a sessão.

## 4. Segurança e encerramento

* [x] Tokens e segredos não aparecem no HTML, nas URLs salvas, no armazenamento Web, nos registros ou nas evidências entregues.
* [x] A equipe consegue explicar por que os arquivos estáticos permanecem públicos.
* [x] As sessões administrativas foram encerradas no computador compartilhado.
* [x] Os Client Secrets continuam armazenados como segredos criptografados no Cloudflare Pages.
* [x] Nenhum segredo foi versionado no histórico do GitHub.

## 5. Testes de falha

* [x] Caso 1 — Retorno sem cookie temporário: rejeitado.
* [x] Caso 2 — State alterado: rejeitado.
* [x] Caso 3 — Reutilização da transação OAuth: rejeitada.
* [x] Caso 4 — Sessão expirada: `/api/me` retornou HTTP 401.
* [x] Caso 5 — Logout com Origin inválido: servidor retornou HTTP 403.
* [x] Caso 6 — Reutilização de cookie revogado: `/api/me` retornou HTTP 401.

## 6. Responsável pela entrega

**Nome:** Bernardo Lopes de Araujo

**Data da conferência final:30/09/2026

**Observações:** ______________________________________________
