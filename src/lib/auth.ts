import { betterAuth } from 'better-auth';
import { getTasksPool } from './tasks/db';
import {
  isAllowedVerifiedEmail,
  isLocalDevelopmentAuthEnabled,
  isLoopbackHost,
  normalizeEmail,
} from './auth-policy';

const LOCAL_DEVELOPMENT_USER = {
  id: 'local-development-user',
  email: 'local-development@taskflow.local',
  name: 'Local Developer',
  authMode: 'local-development' as const,
};

export class AuthConfigurationError extends Error {
  constructor() {
    super('Authentication configuration is incomplete.');
    this.name = 'AuthConfigurationError';
  }
}

export class AuthServiceUnavailableError extends Error {
  constructor() {
    super('Authentication service is unavailable.');
    this.name = 'AuthServiceUnavailableError';
  }
}

const authSecret = process.env.BETTER_AUTH_SECRET;
const authBaseUrl = process.env.BETTER_AUTH_URL;
const googleClientId = process.env.TASKFLOW_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.TASKFLOW_GOOGLE_CLIENT_SECRET;
const allowedEmail = normalizeEmail(process.env.TASKFLOW_ALLOWED_EMAIL);

function hasValidBaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return false;
    return true;
  } catch {
    return false;
  }
}

export const auth =
  authSecret && authSecret.length >= 32 &&
  hasValidBaseUrl(authBaseUrl) &&
  googleClientId?.trim() && googleClientSecret?.trim() && allowedEmail
    ? betterAuth({
        database: getTasksPool(),
        secret: authSecret,
        baseURL: authBaseUrl,
        trustedOrigins: [authBaseUrl],
        session: {
          expiresIn: 60 * 60 * 24 * 7,
          updateAge: 60 * 60 * 24,
        },
        account: {
          encryptOAuthTokens: true,
        },
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            requireEmailVerification: true,
            disableImplicitSignUp: true,
            prompt: 'select_account',
          },
        },
        user: {
          validateUserInfo: ({ user, source }) => {
            if (
              source.method !== 'oauth' ||
              source.oauth?.providerId !== 'google' ||
              !isAllowedVerifiedEmail(
                typeof user.email === 'string' ? user.email : undefined,
                user.emailVerified === true,
                allowedEmail ?? undefined
              )
            ) {
              return {
                error: 'account_not_allowed',
                errorDescription: 'This Google account is not authorized for this personal workspace.',
              };
            }
          },
        },
      })
    : null;

export function isAuthConfigured(): boolean {
  return auth !== null;
}

export function getAuth() {
  if (!auth) throw new AuthConfigurationError();
  return auth;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  authMode: 'local-development' | 'better-auth';
}

export async function getAuthenticatedUser(
  requestHeaders: Headers
): Promise<AuthenticatedUser | null> {
  if (isLocalDevelopmentAuthEnabled(process.env.NODE_ENV, process.env.TASKFLOW_LOCAL_AUTH)) {
    // This identity is only available to loopback requests in an explicitly opted-in
    // development process. The dev server is also bound to 127.0.0.1 in package.json.
    return isLoopbackHost(requestHeaders.get('host')) ? LOCAL_DEVELOPMENT_USER : null;
  }

  const authInstance = getAuth();
  let session;
  try {
    session = await authInstance.api.getSession({ headers: requestHeaders });
  } catch {
    // Do not return driver errors or SQL details to a browser.
    throw new AuthServiceUnavailableError();
  }

  if (
    !session ||
    !isAllowedVerifiedEmail(
      session.user.email,
      session.user.emailVerified,
      allowedEmail ?? undefined
    )
  ) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    authMode: 'better-auth',
  };
}
