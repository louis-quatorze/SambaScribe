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

  // Check both token and database state for paid access
  const hasPaidAccess = token.hasPaidAccess === true;
  
  // If token shows no access, double check the database
  if (!hasPaidAccess && token.sub) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { hasPaidAccess: true }
      });
      
      if (user?.hasPaidAccess) {
        // User has access in database but not in token, allow the request
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Error checking user access in middleware:', error);
    }
  }

  // If neither token nor database show paid access, handle accordingly
  if (!hasPaidAccess) {
    // Handle differently based on request type (API vs page)
    if (path.startsWith('/api/')) {
      // For API requests, return a JSON response with an error
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
      // For page requests, redirect to pricing page
      return NextResponse.redirect(new URL('/pricing', request.url));
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Configure which paths should be handled by this middleware
export const config = {
  matcher: [
    '/api/upload/:path*', // Protect file uploads
    '/api/user/:path*',   // Protect user-specific endpoints
  ],
}; 