"use client";

import { config } from "@/config/wagmi";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { sdk } from "@farcaster/frame-sdk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter } from "next/font/google";
import { useEffect } from "react";
import { WagmiProvider } from "wagmi";
import "./globals.css";
const farcasterAuthConfig = {
  rpcUrl: "https://mainnet.optimism.io",
  domain: process.env.NEXT_PUBLIC_URL || "localhost:3000",
  siweUri: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/login`,
};

const inter = Inter({ subsets: ["latin"] });
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
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <AuthKitProvider config={farcasterAuthConfig}>
              {children}
            </AuthKitProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
