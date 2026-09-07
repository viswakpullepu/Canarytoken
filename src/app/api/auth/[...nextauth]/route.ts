import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { getUserPasswordHash, setUserPasswordHash } from "@/lib/storage";

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

        const username = credentials.username.toLowerCase().trim();
        const existingHash = await getUserPasswordHash(username);

        if (existingHash) {
          const isValid = await bcrypt.compare(credentials.password, existingHash);
          if (!isValid) throw new Error("Invalid password");
          return { id: username, name: username };
        } else {
          const passwordHash = await bcrypt.hash(credentials.password, 10);
          await setUserPasswordHash(username, passwordHash);
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
