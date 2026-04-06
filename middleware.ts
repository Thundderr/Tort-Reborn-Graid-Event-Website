import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, incrementRateLimit, createRateLimitResponse, getRateLimitKey } from './lib/rate-limit';
import { sendSecurityAlert } from './lib/discord-alert';

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Exempt analytics tracking from rate limiting (frequent heartbeats)
    if (request.nextUrl.pathname === '/api/analytics/track') {
      return NextResponse.next();
    }
    // Destructive operation rate limiting (DELETE requests and bulk POST to exec routes)
    const isDestructive =
      request.nextUrl.pathname.startsWith('/api/exec/') && (
        request.method === 'DELETE' ||
        (request.method === 'POST' && request.nextUrl.pathname.includes('/bulk'))
      );

    if (isDestructive) {
      const destructiveCheck = checkRateLimit(request, 'destructive');
      if (!destructiveCheck.allowed) {
        // Fire-and-forget alert to Discord — don't block the response
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        sendSecurityAlert(
          `**Rate limit hit on destructive operations**\nIP: \`${ip}\`\nPath: \`${request.method} ${request.nextUrl.pathname}\`\nSomeone is rapidly deleting data — possible compromised account.`
        ).catch(() => {});
        return createRateLimitResponse(destructiveCheck.resetTime);
      }
      incrementRateLimit(request, 'destructive');
    }

    // Global rate limiting check (this runs before the specific endpoint rate limiting)
    const rateLimitCheck = checkRateLimit(request);

    if (!rateLimitCheck.allowed) {
      return createRateLimitResponse(rateLimitCheck.resetTime);
    }

    // Increment global rate limit counter
    incrementRateLimit(request);
    
    // Add rate limit headers to the response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitCheck.remainingRequests.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitCheck.resetTime / 1000).toString());
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
};
