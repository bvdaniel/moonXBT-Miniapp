import { createAppClient, viemConnector } from "@farcaster/auth-client";
import { getServerSession, NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import TwitterProvider from "next-auth/providers/twitter";

// Extender los tipos de NextAuth
declare module "next-auth" {
  interface Session {
    fid?: number;
    twitterId?: string;
    twitterHandle?: string;
    connectedProviders?: string[];
    account?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: Date;
    };
    user: {
      id: string;
      fid?: number;
      twitterId?: string;
      twitterHandle?: string;
    };
  }

  interface User {
    fid?: number;
    twitterId?: string;
    twitterHandle?: string;
    provider?: string;
  }

  interface JWT {
    fid?: number;
    twitterId?: string;
    twitterHandle?: string;
    connectedProviders?: string[];
    account?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: Date;
    };
  }
}

const domain =
  process.env.NODE_ENV === "development"
    ? "localhost:3000"
    : process.env.NEXT_PUBLIC_URL || "localhost:3000";

const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const useSecureCookies = nextAuthUrl.startsWith("https:");

console.log(process.env.NEXTAUTH_URL);

export const authOptions: NextAuthOptions = {
  providers: [
    // Farcaster provider usando credentials
    CredentialsProvider({
      id: "farcaster",
      name: "Sign in with Farcaster",
      credentials: {
        message: { label: "Message", type: "text", placeholder: "0x0" },
        signature: { label: "Signature", type: "text", placeholder: "0x0" },
        name: { label: "Name", type: "text", placeholder: "0x0" },
        pfp: { label: "Pfp", type: "text", placeholder: "0x0" },
        nonce: { label: "Nonce", type: "text", placeholder: "0x0" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        try {
          const client = createAppClient({
            relay: "https://relay.farcaster.xyz",
            ethereum: viemConnector(),
          });

          const verifyResponse = await client.verifySignInMessage({
            message: credentials.message,
            signature: credentials.signature as `0x${string}`,
            nonce: credentials.nonce,
            domain: domain,
          });

          if (!verifyResponse.success) {
            return null;
          }

          return {
            id: `fc_${verifyResponse.fid}`,
            fid: verifyResponse.fid,
            name: credentials.name,
            image: credentials.pfp,
            provider: "farcaster",
          };
        } catch (error) {
          console.error("Farcaster auth error:", error);
          return null;
        }
      },
    }),

    // Twitter/X OAuth provider
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0",
      authorization: {
        params: {
          scope: ["tweet.read", "users.read"].join(" "),
        },
      },
      userinfo: {
        url: "https://api.twitter.com/2/users/me",
        params: {
          "user.fields": "id,name,username,public_metrics",
        },
        async request({ tokens }) {
          const response = await fetch(
            `https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics`,
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
              },
            }
          );

          const profile = await response.json();
          console.log("Twitter API Response:", profile);

          if (!profile.data) {
            console.error("Twitter API Error:", profile);
            throw new Error("Failed to get user data from Twitter");
          }

          return {
            id: profile.data.id,
            name: profile.data.name,
            email: undefined,
            image: undefined,
            username: profile.data.username,
          };
        },
      },
      profile(profile) {
        return {
          id: `tw_${profile.id}`,
          twitterId: profile.id,
          twitterHandle: profile.username,
          name: profile.name,
          provider: "twitter",
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ account }) {
      if (!account) return false;
      return true;
    },

    async jwt({ token, account }) {
      if (account) {
        token.account = {
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresIn: new Date(Date.now() + 3600 * 1000),
        };
      }
      return token;
    },

    async session({ session, token }) {
      if (token.account) {
        const account = token.account as {
          accessToken: string;
          refreshToken: string;
          expiresIn: Date;
        };

        session.account = {
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          expiresIn: account.expiresIn,
        };
      }
      return session;
    },

    // Manejar redirecciones después del sign in
    async redirect({ url, baseUrl }) {
      // Permite redirecciones a URLs internas y a la página de callback
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Configurar cookies para múltiples providers
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
  },

  debug: false, // Desactivar debug en producción
};

export { getServerSession };

export const getSession = async () => {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Error getting server session:", error);
    return null;
  }
};

// Función helper para verificar si un provider específico está conectado
export const isProviderConnected = (
  session: Session | null,
  provider: string
): boolean => {
  return session?.connectedProviders?.includes(provider) || false;
};

// Función helper para obtener información específica del provider
export const getProviderInfo = (session: Session | null, provider: string) => {
  switch (provider) {
    case "farcaster":
      return {
        connected: !!session?.fid,
        id: session?.fid,
        handle: null, // Farcaster no proporciona handle directamente
      };
    case "twitter":
      return {
        connected: !!session?.twitterId,
        id: session?.twitterId,
        handle: session?.twitterHandle,
      };
    default:
      return { connected: false, id: null, handle: null };
  }
};
