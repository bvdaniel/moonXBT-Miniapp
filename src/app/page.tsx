"use client"

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { Button } from '@/components/ui/Button';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';

// A0X Token Contract ABI - only the balanceOf function
const tokenABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const A0X_TOKEN_ADDRESS = '0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7';

export default function Home() {
  const [balance, setBalance] = useState<string | null>(null);
  const { address, isConnected } = useAccount();

  const { data: tokenBalance } = useReadContract({
    address: A0X_TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    // Hide splash screen when component mounts
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    if (tokenBalance) {
      setBalance(formatEther(tokenBalance));
    }
  }, [tokenBalance]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">MoonXBT</h1>
          <p className="text-gray-400">Follow us across social media!</p>
        </div>

        {isConnected && balance !== null && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 text-center">
            <p className="text-gray-400">Your $A0X Balance</p>
            <p className="text-2xl font-bold">{Number(balance).toLocaleString()} A0X</p>
          </div>
        )}

        <div className="space-y-4">
          <Button 
            onClick={() => window.open('https://warpcast.com/ai420z', '_blank')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Follow on Farcaster
          </Button>

          <Button 
            onClick={() => window.open('https://x.com/moonXBT_ai', '_blank')}
            className="w-full bg-black hover:bg-gray-900 border border-gray-700"
          >
            Follow on X
          </Button>

          <Button 
            onClick={() => window.open('https://www.tiktok.com/@moonxbt.fun', '_blank')}
            className="w-full bg-black hover:bg-gray-900 border border-gray-700"
          >
            Follow on TikTok
          </Button>

          <Button 
            onClick={() => window.open('https://www.instagram.com/moonxbt_ai/', '_blank')}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
          >
            Follow on Instagram
          </Button>

          <Button 
            onClick={() => window.open('https://zora.co/@moonxbt', '_blank')}
            className="w-full bg-black hover:bg-gray-900 border border-gray-700"
          >
            Follow on Zora
          </Button>

          <Button 
            onClick={() => window.open('https://t.me/A0X_Portal', '_blank')}
            className="w-full bg-[#0088cc] hover:bg-[#0077b3]"
          >
            Join Telegram Group
          </Button>
        </div>
      </div>
    </main>
  );
}
