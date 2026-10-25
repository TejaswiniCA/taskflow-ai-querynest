export function normalizeEmail(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isAllowedVerifiedEmail(
  email: string | undefined,
  emailVerified: boolean,
  allowedEmail: string | undefined
): boolean {
  const allowed = normalizeEmail(allowedEmail);
  const candidate = normalizeEmail(email);
  return Boolean(allowed && candidate && emailVerified && candidate === allowed);
}

export function isLocalDevelopmentAuthEnabled(
  nodeEnv: string | undefined,
  localAuthFlag: string | undefined
): boolean {
  return nodeEnv === 'development' && localAuthFlag === 'true';
}

export function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}
