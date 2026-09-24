const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_ENDPOINT =
  "https://oauth2.googleapis.com/token";

const GITHUB_AUTHORIZATION_ENDPOINT =
  "https://github.com/login/oauth/authorize";

const GITHUB_TOKEN_ENDPOINT =
  "https://github.com/login/oauth/access_token";

export function getProviderConfig(provider, env) {
  if (provider === "google") {
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorizationEndpoint: GOOGLE_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
      redirectUri: `${env.PUBLIC_BASE_URL}/oauth/callback/google`
    };
  }

  if (provider === "github") {
    return {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      authorizationEndpoint: GITHUB_AUTHORIZATION_ENDPOINT,
      tokenEndpoint: GITHUB_TOKEN_ENDPOINT,
      redirectUri: `${env.PUBLIC_BASE_URL}/oauth/callback/github`
    };
  }

  return null;
}
