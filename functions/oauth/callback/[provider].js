import {
  randomBase64Url,
  sha256Base64Url
} from "../../_shared/crypto.js";

import {
  getCookie,
  clearTransactionCookie,
  sessionCookie
} from "../../_shared/cookies.js";

import {
  getProviderConfig
} from "../../_shared/providers.js";

import {
  validateGoogleIdToken
} from "../../_shared/oidc.js";


function errorResponse(status = 400) {
  return new Response("Authentication failed", {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}


async function exchangeGoogleCode(
  code,
  codeVerifier,
  config
) {
  const body = new URLSearchParams();

  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", config.redirectUri);
  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("code_verifier", codeVerifier);

  const response = await fetch(
    config.tokenEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error("google_token_exchange_failed");
  }

  const data = await response.json();

  if (
    typeof data.id_token !== "string" ||
    !data.id_token
  ) {
    throw new Error("missing_google_id_token");
  }

  return data.id_token;
}


async function exchangeGithubCode(
  code,
  codeVerifier,
  config
) {
  const body = new URLSearchParams();

  body.set("client_id", config.clientId);
  body.set("client_secret", config.clientSecret);
  body.set("code", code);
  body.set("redirect_uri", config.redirectUri);
  body.set("code_verifier", codeVerifier);

  const response = await fetch(
    config.tokenEndpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body
    }
  );

  if (!response.ok) {
    throw new Error("github_token_exchange_failed");
  }

  const data = await response.json();

  if (
    typeof data.access_token !== "string" ||
    !data.access_token
  ) {
    throw new Error("missing_github_access_token");
  }

  if (
    typeof data.token_type !== "string" ||
    data.token_type.toLowerCase() !== "bearer"
  ) {
    throw new Error("invalid_github_token_type");
  }

  return data.access_token;
}


async function getGithubProfile(accessToken) {
  const response = await fetch(
    "https://api.github.com/user",
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10"
      }
    }
  );

  if (!response.ok) {
    throw new Error("github_profile_failed");
  }

  const profile = await response.json();

  if (
    !Number.isInteger(profile.id)
  ) {
    throw new Error("invalid_github_subject");
  }

  return {
    issuer: "https://github.com",
    subject: String(profile.id),
    email:
      typeof profile.email === "string"
        ? profile.email
        : null,
    displayName:
      typeof profile.name === "string" && profile.name
        ? profile.name
        : typeof profile.login === "string"
          ? profile.login
          : null
  };
}


async function revokeGithubAuthorization(
  accessToken,
  config
) {
  const authorization = btoa(
    `${config.clientId}:${config.clientSecret}`
  );

  const response = await fetch(
    `https://api.github.com/applications/${encodeURIComponent(config.clientId)}/grant`,
    {
      method: "DELETE",
      headers: {
        "Authorization": `Basic ${authorization}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10"
      },
      body: JSON.stringify({
        access_token: accessToken
      })
    }
  );

  if (response.status !== 204) {
    throw new Error("github_revoke_failed");
  }
}


export async function onRequestGet(context) {
  const provider = context.params.provider;
  const env = context.env;
  const request = context.request;

  // Somente Google e GitHub
  if (
    provider !== "google" &&
    provider !== "github"
  ) {
    return errorResponse(404);
  }

  const config = getProviderConfig(
    provider,
    env
  );

  if (!config) {
    return errorResponse(500);
  }

  try {
    const url = new URL(request.url);

    // Verifica se o provedor retornou um erro
    if (url.searchParams.has("error")) {
      return errorResponse(400);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // code e state são obrigatórios
    if (!code || !state) {
      return errorResponse(400);
    }

    // Recupera o cookie temporário
    const transactionCookie = getCookie(
      request,
      "__Host-oauth-tx"
    );

    if (!transactionCookie) {
      return errorResponse(400);
    }

    // Calcula os hashes
    const idHash = await sha256Base64Url(
      transactionCookie
    );

    const stateHash = await sha256Base64Url(
      state
    );

    const now = Math.floor(
      Date.now() / 1000
    );

    // Procura uma transação válida
    const transactionResult = await env.DB
      .prepare(`
        SELECT
          id_hash,
          provider,
          state_hash,
          nonce,
          code_verifier,
          expires_at
        FROM oauth_transactions
        WHERE id_hash = ?
          AND expires_at > ?
      `)
      .bind(
        idHash,
        now
      )
      .first();

    if (!transactionResult) {
      return errorResponse(400);
    }

    // Confirma que a transação pertence ao provedor correto
    if (
      transactionResult.provider !== provider
    ) {
      return errorResponse(400);
    }

    // Confirma o state
    if (
      transactionResult.state_hash !== stateHash
    ) {
      return errorResponse(400);
    }

    /*
     * A transação deve ser apagada antes
     * de concluir o fluxo.
     */
    await env.DB
      .prepare(`
        DELETE FROM oauth_transactions
        WHERE id_hash = ?
      `)
      .bind(idHash)
      .run();


    let identity;

    // =========================
    // GOOGLE
    // =========================

    if (provider === "google") {
      const idToken = await exchangeGoogleCode(
        code,
        transactionResult.code_verifier,
        config
      );

      identity = await validateGoogleIdToken(
        idToken,
        {
          clientId: config.clientId,
          expectedNonce: transactionResult.nonce
        }
      );
    }


    // =========================
    // GITHUB
    // =========================

    if (provider === "github") {
      const accessToken =
        await exchangeGithubCode(
          code,
          transactionResult.code_verifier,
          config
        );

      identity =
        await getGithubProfile(
          accessToken
        );

      /*
       * O token do GitHub é usado somente
       * para consultar /user e depois
       * revogar a autorização.
       */
      await revokeGithubAuthorization(
        accessToken,
        config
      );
    }


    if (
      !identity ||
      typeof identity.issuer !== "string" ||
      typeof identity.subject !== "string" ||
      !identity.subject
    ) {
      return errorResponse(400);
    }


    // =========================
    // CRIAÇÃO DA SESSÃO
    // =========================

    const sessionValue =
      randomBase64Url(32);

    const sessionHash =
      await sha256Base64Url(
        sessionValue
      );

    const sessionExpiresAt =
      Math.floor(Date.now() / 1000) +
      28800;

    await env.DB
      .prepare(`
        INSERT INTO sessions
          (
            id_hash,
            issuer,
            subject,
            email,
            display_name,
            expires_at,
            created_at
          )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        sessionHash,
        identity.issuer,
        identity.subject,
        identity.email,
        identity.displayName,
        sessionExpiresAt,
        now
      )
      .run();


    // =========================
    // RETORNO PARA O SITE
    // =========================

    return new Response(null, {
      status: 302,
      headers: {
        "Location": env.PUBLIC_BASE_URL,
        "Set-Cookie":
          [
            clearTransactionCookie(),
            sessionCookie(sessionValue)
          ],
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    return errorResponse(500);
  }
}
