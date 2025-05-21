import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import { createAppClient, viemConnector } from "@farcaster/auth-client";

declare module "next-auth" {
  interface Session {
    fid?: number;
  }
  interface User {
    fid: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Farcaster",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
        nonce: { label: "Nonce", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.message || !credentials?.signature || !credentials?.nonce) {
          return null;
        }

        try {
          const client = createAppClient({
            relay: "https://relay.farcaster.xyz",
            ethereum: viemConnector(),
          });

          const verifyResponse = await client.verifySignInMessage({
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
            nonce: credentials.nonce,
            domain: process.env.NEXT_PUBLIC_URL || 'localhost:3000',
          });

          if (!verifyResponse.success) {
            return null;
          }

          return {
            id: verifyResponse.fid.toString(),
            fid: verifyResponse.fid,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.fid = parseInt(token.sub);
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export { getServerSession };

export const getSession = async () => {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}
