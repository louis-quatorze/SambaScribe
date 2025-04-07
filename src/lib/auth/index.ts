import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
  }
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
          return false;
        }

        // Google OAuth specific checks
        if (account?.provider === "google") {
          if (!profile?.email_verified) {
            console.error("SignIn error: Google email not verified");
            return false;
          }
        }

        // Additional validation can be added here
        // For example, domain restrictions:
        // const allowedDomains = ["example.com"];
        // if (!allowedDomains.some(domain => user.email?.endsWith(domain))) {
        //   console.error("SignIn error: Email domain not allowed");
        //   return false;
        // }

        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
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
