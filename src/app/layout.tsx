"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { config } from "@/config/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { AuthKitProvider } from "@farcaster/auth-kit";
const farcasterAuthConfig = {
  rpcUrl: "https://mainnet.optimism.io", // o tu RPC de Optimism
  domain: process.env.NEXT_PUBLIC_URL || "localhost:3000", // Asegúrate que coincida
  siweUri: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/login`, // No usado directamente por next-auth creds, pero auth-kit lo pide
};

const inter = Inter({ subsets: ["latin"] });
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Call ready when the interface is ready to be displayed
    sdk.actions.ready({ disableNativeGestures: true });
  }, []);

  return (
    <html lang="en">
      <head>
        <meta
          name="fc:frame"
          content='{"version":"next","imageUrl":"https://moonxbt.com/og-image.png","button":{"title":"Follow MoonXBT","action":{"type":"launch_frame","name":"MoonXBT","url":"https://moonxbt.com","splashImageUrl":"https://moonxbt.com/logo.png","splashBackgroundColor":"#000000"}}}'
        />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <SessionProvider>
              <AuthKitProvider config={farcasterAuthConfig}>
                {children}
              </AuthKitProvider>
            </SessionProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
