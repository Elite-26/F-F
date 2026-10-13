import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import clientPromise, { testConnection } from '@/lib/mongodb';
import { User } from '@/types/models';
import { normalizeResumeTemplate } from '@/lib/resume/template-ids';
import { normalizeExperienceOption } from '@/lib/resume/experience-option';

// Test MongoDB connection on startup
testConnection().catch((error) => {
  console.error('Failed to connect to MongoDB during NextAuth initialization:', error);
});

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
          const client = await clientPromise;
          const db = client.db('fandf');
          
          // Check database for user - now with type safety!
          const user = await db.collection<User>('users').findOne({
            email: credentials.email,
          });

          if (!user) {
            console.log('User not found:', credentials.email);
            return null;
          }

          // Check if user is approved
          if (!user.approved) {
            console.log('User not approved:', credentials.email);
            throw new Error('Your account is pending approval. Please wait for admin approval.');
          }

          // Verify password using bcrypt
          const passwordMatch = bcrypt.compareSync(credentials.password, user.password);
          
          if (!passwordMatch) {
            console.log('Invalid password for user:', credentials.email);
            return null;
          }

          // Return user object on successful authentication
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          // Re-throw approval errors so they can be caught by the client
          if (error instanceof Error && error.message.includes('approval')) {
            throw error;
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.resumeTemplate = 'template_1';
        session.user.experienceOption = 'option_1';
        if (session.user.email) {
          const client = await clientPromise;
          const db = client.db('fandf');
          const user = await db.collection<User>('users').findOne({ email: session.user.email });
          session.user.resumeTemplate = normalizeResumeTemplate(user?.resumeTemplate);
          session.user.experienceOption = normalizeExperienceOption(user?.experienceOption);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

