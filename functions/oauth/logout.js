import { sha256Base64Url } from "../_shared/crypto.js";
import {
  getCookie,
  clearSessionCookie
} from "../_shared/cookies.js";

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;

  try {
    // O Origin precisa ser exatamente o endereço
    // de produção configurado em PUBLIC_BASE_URL.
    const origin = request.headers.get("Origin");

    if (origin !== env.PUBLIC_BASE_URL) {
      return new Response("Forbidden", {
        status: 403,
        headers: {
          "Cache-Control": "no-store"
        }
      });
    }

    // Recupera o cookie da sessão.
    const sessionCookie = getCookie(
      request,
      "__Host-session"
    );

    // Se não existir sessão, ainda podemos
    // limpar o cookie e responder normalmente.
    if (sessionCookie) {
      const sessionHash =
        await sha256Base64Url(sessionCookie);

      // Remove a sessão do D1.
      await env.DB
        .prepare(`
          DELETE FROM sessions
          WHERE id_hash = ?
        `)
        .bind(sessionHash)
        .run();
    }

    // Expira o cookie no navegador.
    return new Response(null, {
      status: 204,
      headers: {
        "Set-Cookie": clearSessionCookie(),
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


// Qualquer método diferente de POST
// não é permitido.
export function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        "Allow": "POST",
        "Cache-Control": "no-store"
      }
    });
  }

  return onRequestPost(context);
}
