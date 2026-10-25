import { NextResponse } from 'next/server';
import { toNextJsHandler } from 'better-auth/next-js';
import { AuthConfigurationError, getAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const handlers = toNextJsHandler(async request => {
  try {
    return await getAuth().handler(request);
  } catch (error) {
    const isConfigurationError = error instanceof AuthConfigurationError;
    return NextResponse.json(
      {
        error: isConfigurationError
          ? 'Authentication is not configured. Check the local auth environment and database migration.'
          : 'Authentication request failed.',
      },
      { status: isConfigurationError ? 503 : 500 }
    );
  }
});

export const { GET, POST } = handlers;
