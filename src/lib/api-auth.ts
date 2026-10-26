import { NextResponse } from 'next/server';
import { AuthConfigurationError, AuthServiceUnavailableError, getAuthenticatedUser } from '@/lib/auth';

export async function requireAuthenticatedRequest(headers: Headers) {
  try {
    const user = await getAuthenticatedUser(headers);
    return user
      ? { user, response: null }
      : { user: null, response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  } catch (error) {
    const unavailable = error instanceof AuthConfigurationError || error instanceof AuthServiceUnavailableError;
    return {
      user: null,
      response: NextResponse.json(
        { error: error instanceof AuthConfigurationError ? 'Authentication is not configured.' : 'Authentication service is unavailable.' },
        { status: unavailable ? 503 : 500 }
      ),
    };
  }
}
