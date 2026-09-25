import { sha256Base64Url } from "../_shared/crypto.js";
import { getCookie } from "../_shared/cookies.js";

export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;

  try {
    // Recupera o cookie da sessão
    const sessionCookie = getCookie(
      request,
      "__Host-session"
    );

    // Sem cookie = não autenticado
    if (!sessionCookie) {
      return Response.json(
        { user: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    // O D1 armazena somente o hash
    const sessionHash =
      await sha256Base64Url(sessionCookie);

    const now =
      Math.floor(Date.now() / 1000);

    // Procura uma sessão ainda válida
    const session = await env.DB
      .prepare(`
        SELECT
          issuer,
          subject,
          email,
          display_name,
          expires_at
        FROM sessions
        WHERE id_hash = ?
          AND expires_at > ?
      `)
      .bind(
        sessionHash,
        now
      )
      .first();

    // Sessão inexistente ou expirada
    if (!session) {
      return Response.json(
        { user: null },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    // Perfil mínimo
    return Response.json(
      {
        user: {
          issuer: session.issuer,
          subject: session.subject,
          email: session.email,
          displayName: session.display_name
        }
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return Response.json(
      { user: null },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
