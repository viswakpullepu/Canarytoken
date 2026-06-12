import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { getRedis } from "@/lib/storage";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing username or password");
        }
        
        const redis = getRedis();
        if (!redis) throw new Error("Database offline");

        const username = credentials.username.toLowerCase().trim();
        const userStr = await redis.get(`auth:user:${username}`);
        
        if (userStr) {
          // User exists, check password
          const user = JSON.parse(userStr);
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) throw new Error("Invalid password");
          return { id: username, name: username };
        } else {
          // Create new user if not exists
          const passwordHash = await bcrypt.hash(credentials.password, 10);
          await redis.set(`auth:user:${username}`, JSON.stringify({ passwordHash, created_at: new Date().toISOString() }));
          return { id: username, name: username };
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  secret: process.env.NEXTAUTH_SECRET || "canary_fallback_secret_12345",
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };
