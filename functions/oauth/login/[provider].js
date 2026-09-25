import {
  randomBase64Url,
  sha256Base64Url
} from "../../_shared/crypto.js";

import {
  transactionCookie
} from "../../_shared/cookies.js";

import {
  getProviderConfig
} from "../../_shared/providers.js";

export async function onRequestGet(context) {
  const provider = context.params.provider;
  const env = context.env;

  // Aceita somente os provedores definidos na atividade
  if (provider !== "google" && provider !== "github") {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  const config = getProviderConfig(provider, env);

  if (!config) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  try {
    // Valores aleatórios
    const state = randomBase64Url(32);
    const txCookieValue = randomBase64Url(32);
    const codeVerifier = randomBase64Url(32);

    // Nonce somente para Google
    const nonce = provider === "google"
      ? randomBase64Url(32)
      : null;

    // Hashes que serão armazenados no D1
    const idHash = await sha256Base64Url(txCookieValue);
    const stateHash = await sha256Base64Url(state);

    // PKCE: code_challenge = BASE64URL(SHA-256(code_verifier))
    const codeChallenge = await sha256Base64Url(codeVerifier);

    // Transação válida por 10 minutos
    const expiresAt = Math.floor(Date.now() / 1000) + 600;

    // Salva a transação no D1
    await env.DB
      .prepare(`
        INSERT INTO oauth_transactions
          (id_hash, provider, state_hash, nonce, code_verifier, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        idHash,
        provider,
        stateHash,
        nonce,
        codeVerifier,
        expiresAt
      )
      .run();

    // Monta a URL de autorização
    const authorizationUrl = new URL(
      config.authorizationEndpoint
    );

    authorizationUrl.searchParams.set(
      "client_id",
      config.clientId
    );

    authorizationUrl.searchParams.set(
      "redirect_uri",
      config.redirectUri
    );

    authorizationUrl.searchParams.set(
      "response_type",
      "code"
    );

    authorizationUrl.searchParams.set(
      "state",
      state
    );

    authorizationUrl.searchParams.set(
      "code_challenge",
      codeChallenge
    );

    authorizationUrl.searchParams.set(
      "code_challenge_method",
      "S256"
    );

    // Google exige os parâmetros adicionais da atividade
    if (provider === "google") {
      authorizationUrl.searchParams.set(
        "scope",
        "openid email profile"
      );

      authorizationUrl.searchParams.set(
        "nonce",
        nonce
      );
    }

    // GitHub não recebe scope, nonce, segredo ou code_verifier

    return new Response(null, {
      status: 302,
      headers: {
        "Location": authorizationUrl.toString(),
        "Set-Cookie": transactionCookie(txCookieValue),
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }
}
