"use client";

import { config } from "@/config/wagmi";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/frame-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import { useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import "./globals.css";

const farcasterAuthConfig = {
  rpcUrl: "https://mainnet.optimism.io",
  domain: process.env.NEXT_PUBLIC_URL || "localhost:3000",
  siweUri: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/login`,
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <html lang="en">
      <body className={`${inter.variable} font-inter`}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{
            loginMethods: ["wallet", "telegram", "twitter", "farcaster"],
            appearance: {
              theme: "dark",
              accentColor: "#1752F0",
            },
            embeddedWallets: {
              createOnLogin: "users-without-wallets",
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={config}>
              <AuthKitProvider config={farcasterAuthConfig}>
                {children}
              </AuthKitProvider>
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
