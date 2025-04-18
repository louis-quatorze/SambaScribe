import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { logEventsToFile } from "@/lib/server/analytics";
import { type AnalyticsEvent } from "@/lib/analytics";

export enum UserRole {
  user = "user",
  admin = "admin",
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth/adapters" {
  interface AdapterUser {
    login?: string;
    role?: UserRole;
    dashboardEnabled?: boolean;
    isTeamAdmin?: boolean;
  }
}

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
      role?: UserRole;
      dashboardEnabled?: boolean;
      isAdmin?: boolean;
      expires?: string;
      isTeamAdmin?: boolean;
      hasPaidAccess?: boolean;
      subscriptionType?: string;
      subscriptionStatus?: string;
    };
    accessToken?: string;
  }

  export interface Profile {
    login: string;
    email_verified?: boolean;
  }

  interface User {
    role?: UserRole;
    login?: string;
    expires?: string;
    isTeamAdmin?: boolean;
    isAdmin?: boolean;
    hasPaidAccess?: boolean;
    subscriptionType?: string;
    subscriptionStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    isAdmin?: boolean;
    login?: string;
    hasPaidAccess?: boolean;
    subscriptionType?: string;
    subscriptionStatus?: string;
  }
}

// Function to log auth events server-side
function logAuthEvent(type: string, data: any) {
  // Log directly to file since we're on the server
  logEventsToFile([{
    type: 'auth',
    target: type,
    metadata: data,
    timestamp: Date.now()
  }]);
  
  console.log(`[Auth] ${type}:`, data);
}

export const authOptions: NextAuthOptions = {
  // No adapter - use JWT only
  providers: [
    // Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt", // Use JWT when no database is available
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Basic validation
        if (!user?.email) {
          console.error("SignIn error: No email provided");
          logAuthEvent('signin_error', { error: 'No email provided' });
          return false;
        }

        // Google OAuth specific checks
        if (account?.provider === "google") {
          if (!profile?.email_verified) {
            console.error("SignIn error: Google email not verified");
            logAuthEvent('signin_error', { 
              provider: account.provider, 
              error: 'Email not verified'
            });
            return false;
          }
        }

        // Log successful sign-in
        logAuthEvent('signin_success', { 
          email: user.email,
          provider: account?.provider,
          userId: user.id
        });

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        logAuthEvent('signin_error', { error: String(error) });
        // You can throw specific errors here to trigger the error page
        // throw new Error("OAuthSignin");
        return false;
      }
    },
    async session({ session, token }) {
      try {
        // When using JWT strategy, user comes from token
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub || "",
            role: token.role as UserRole || UserRole.user,
            isAdmin: token.isAdmin as boolean || false,
            hasPaidAccess: token.hasPaidAccess as boolean || false,
            subscriptionType: token.subscriptionType as string || undefined,
            subscriptionStatus: token.subscriptionStatus as string || undefined,
          },
        };
      } catch (error) {
        console.error("Session callback error:", error);
        return session;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        // First time JWT is created
        token.role = user.role || UserRole.user;
        token.isAdmin = user.isAdmin || false;
        token.hasPaidAccess = user.hasPaidAccess || false;
        token.subscriptionType = user.subscriptionType;
        token.subscriptionStatus = user.subscriptionStatus;
      }

      // Check for subscription updates from the database on each token refresh
      try {
        // Query the database for the latest subscription info
        const userId = token.sub;
        if (userId && typeof userId === 'string') {
          // Import here to avoid circular dependencies
          const { prisma } = await import('@/lib/db');
          
          // Find the user in the database with specific fields
          const dbUser = await prisma.user.findUnique({
            where: { id: userId }
          });
          
          // Find active subscription
          const subscription = await prisma.subscription.findFirst({
            where: { 
              userId: userId,
              status: {
                in: ['active', 'trialing'] 
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          if (dbUser) {
            // Update token with latest subscription info
            token.hasPaidAccess = dbUser.hasPaidAccess;
            token.subscriptionType = dbUser.subscriptionType || undefined;
            token.subscriptionStatus = dbUser.subscriptionStatus || undefined;
            
            // If we have an active subscription but the user doesn't have paid access yet,
            // update the token and fix the inconsistency
            if (subscription && !dbUser.hasPaidAccess) {
              token.hasPaidAccess = true;
              
              // Also fix the database inconsistency
              await prisma.user.update({
                where: { id: userId },
                data: { hasPaidAccess: true }
              });
            }
          }
        }
      } catch (error) {
        console.error("Error refreshing subscription in JWT:", error);
      }
      
      return token;
    }
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
};

export const getServerAuthSession = () => getServerSession(authOptions);
