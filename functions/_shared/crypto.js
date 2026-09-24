function bytesToBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function randomBase64Url(bytesLength = 32) {
  const bytes = new Uint8Array(bytesLength);
  crypto.getRandomValues(bytes);

  return bytesToBase64Url(bytes);
}

export async function sha256Base64Url(value) {
  const data = new TextEncoder().encode(value);

  const digest = await crypto.subtle.digest("SHA-256", data);

  return bytesToBase64Url(new Uint8Array(digest));
}

export function base64UrlToBytes(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export function base64UrlToJson(value) {
  const bytes = base64UrlToBytes(value);
  const text = new TextDecoder().decode(bytes);

  return JSON.parse(text);
}
