import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Protected premium routes - modify this list as needed
  const premiumRoutes = [
    '/api/upload', // Only premium users can upload their own files
  ];

  // Check if the requested path matches any premium routes
  const isPremiumRoute = premiumRoutes.some(route => path.startsWith(route));

  // If it's not a premium route, allow the request to proceed
  if (!isPremiumRoute) {
    return NextResponse.next();
  }

  // For premium routes, check user's subscription status
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If not authenticated, redirect to sign in
  if (!token) {
    const url = new URL('/auth/signin', request.url);
    url.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(url);
  }

  // Check if the user has paid access in the database
  const userId = token.sub;
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { hasPaidAccess: true }
      });

      // If user has paid access in the database but not in the token,
      // we'll still allow them through and let the session update handle it
      if (user?.hasPaidAccess) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error checking user paid access:', error);
    }
  }

  // If no paid access in token or database, return error or redirect
  if (path.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'This feature requires a premium subscription',
      }),
      {
        status: 403,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  } else {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }
}

// Configure which paths should be handled by this middleware
export const config = {
  matcher: [
    '/api/upload/:path*', // Protect file uploads
    '/api/user/:path*',   // Protect user-specific endpoints
  ],
}; 