import { base64UrlToJson } from "./crypto.js";

const GOOGLE_ISSUER = "https://accounts.google.com";
const GOOGLE_DISCOVERY_URL =
  "https://accounts.google.com/.well-known/openid-configuration";

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function getGoogleConfiguration() {
  const response = await fetch(GOOGLE_DISCOVERY_URL);

  if (!response.ok) {
    throw new Error("oidc_discovery_failed");
  }

  return response.json();
}

async function getGoogleJwks(jwksUri) {
  const response = await fetch(jwksUri);

  if (!response.ok) {
    throw new Error("oidc_jwks_failed");
  }

  return response.json();
}

function decodeJwtPart(part) {
  return base64UrlToJson(part);
}

export async function validateGoogleIdToken(
  idToken,
  {
    clientId,
    expectedNonce
  }
) {
  const parts = idToken.split(".");

  if (parts.length !== 3) {
    throw new Error("invalid_id_token");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);

  if (header.alg !== "RS256") {
    throw new Error("invalid_id_token_algorithm");
  }

  if (!header.kid) {
    throw new Error("missing_key_id");
  }

  const configuration = await getGoogleConfiguration();

  if (configuration.issuer !== GOOGLE_ISSUER) {
    throw new Error("invalid_issuer_configuration");
  }

  const jwks = await getGoogleJwks(configuration.jwks_uri);

  const jwk = jwks.keys.find(
    (key) => key.kid === header.kid
  );

  if (!jwk) {
    throw new Error("signing_key_not_found");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const data = new TextEncoder().encode(
    `${encodedHeader}.${encodedPayload}`
  );

  const signature = Uint8Array.from(
    atob(
      encodedSignature
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(
          encodedSignature.length +
            ((4 - (encodedSignature.length % 4)) % 4),
          "="
        )
    ),
    (character) => character.charCodeAt(0)
  );

  const validSignature = await crypto.subtle.verify(
    {
      name: "RSASSA-PKCS1-v1_5"
    },
    publicKey,
    signature,
    data
  );

  if (!validSignature) {
    throw new Error("invalid_signature");
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.iss !== GOOGLE_ISSUER) {
    throw new Error("invalid_issuer");
  }

  if (payload.aud !== clientId) {
    throw new Error("invalid_audience");
  }

  if (
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    throw new Error("expired_id_token");
  }

  if (
    typeof payload.iat !== "number" ||
    payload.iat > now + 300
  ) {
    throw new Error("invalid_issued_at");
  }

  if (
    typeof expectedNonce !== "string" ||
    typeof payload.nonce !== "string" ||
    !timingSafeEqual(payload.nonce, expectedNonce)
  ) {
    throw new Error("invalid_nonce");
  }

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("missing_subject");
  }

  return {
    issuer: GOOGLE_ISSUER,
    subject: payload.sub,
    email: typeof payload.email === "string"
      ? payload.email
      : null,
    displayName: typeof payload.name === "string"
      ? payload.name
      : null
  };
}
