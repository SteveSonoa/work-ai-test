import NextAuth, { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPassword } from '@/lib/services/user.service';
import { createAuditLog } from '@/lib/services/audit.service';
import { UserWithoutPassword } from '@/lib/types/database';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: UserWithoutPassword & {
      id: string;
    };
  }

  interface User extends UserWithoutPassword {
    id: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends UserWithoutPassword {
    id: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await verifyPassword(credentials.email, credentials.password);

          if (!user) {
            return null;
          }

          // Create audit log for login
          await createAuditLog({
            action: 'USER_LOGIN',
            userId: user.id,
            details: {
              email: user.email,
            },
          });

          return user as NextAuthUser;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.first_name = user.first_name;
        token.last_name = user.last_name;
        token.role = user.role;
        token.is_active = user.is_active;
        token.created_at = user.created_at;
        token.updated_at = user.updated_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.email) {
        session.user = {
          id: token.id,
          email: token.email,
          first_name: token.first_name,
          last_name: token.last_name,
          role: token.role,
          is_active: token.is_active,
          created_at: token.created_at,
          updated_at: token.updated_at,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
