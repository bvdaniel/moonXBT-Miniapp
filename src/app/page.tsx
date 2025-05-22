"use client"

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { Button } from '@/components/ui/Button';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { CheckCircle2, Circle } from 'lucide-react';
import Image from 'next/image';

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
const MIN_A0X_REQUIRED = 100; // Minimum A0X tokens required

interface Task {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  action: () => void;
}

export default function Home() {
  const [balance, setBalance] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
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
      const balanceNum = Number(formatEther(tokenBalance));
      setBalance(balanceNum.toString());
      
      // Update tasks with A0X balance check
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === 'hold-a0x' 
            ? { ...task, isCompleted: balanceNum >= MIN_A0X_REQUIRED }
            : task
        )
      );
    }
  }, [tokenBalance]);

  useEffect(() => {
    // Initialize tasks
    setTasks([
      {
        id: 'follow-farcaster',
        title: 'Follow on Farcaster',
        description: 'Follow @ai420z on Farcaster',
        isRequired: true,
        isCompleted: false,
        action: () => window.open('https://warpcast.com/ai420z', '_blank')
      },
      {
        id: 'follow-x',
        title: 'Follow on X',
        description: 'Follow @moonXBT_ai on X',
        isRequired: true,
        isCompleted: false,
        action: () => window.open('https://x.com/moonXBT_ai', '_blank')
      },
      {
        id: 'hold-a0x',
        title: 'Hold A0X Tokens',
        description: `Hold at least ${MIN_A0X_REQUIRED} A0X tokens`,
        isRequired: true,
        isCompleted: false,
        action: () => {}
      },
      {
        id: 'follow-tiktok',
        title: 'Follow on TikTok',
        description: 'Follow @moonxbt.fun on TikTok',
        isRequired: false,
        isCompleted: false,
        action: () => window.open('https://www.tiktok.com/@moonxbt.fun', '_blank')
      },
      {
        id: 'follow-instagram',
        title: 'Follow on Instagram',
        description: 'Follow @moonxbt_ai on Instagram',
        isRequired: false,
        isCompleted: false,
        action: () => window.open('https://www.instagram.com/moonxbt_ai/', '_blank')
      },
      {
        id: 'follow-zora',
        title: 'Follow on Zora',
        description: 'Follow @moonxbt on Zora',
        isRequired: false,
        isCompleted: false,
        action: () => window.open('https://zora.co/@moonxbt', '_blank')
      },
      {
        id: 'join-telegram',
        title: 'Join Telegram',
        description: 'Join the A0X Portal Telegram group',
        isRequired: false,
        isCompleted: false,
        action: () => window.open('https://t.me/A0X_Portal', '_blank')
      }
    ]);
  }, []);

  const requiredTasks = tasks.filter(task => task.isRequired);
  const optionalTasks = tasks.filter(task => !task.isRequired);
  const completedRequiredTasks = requiredTasks.filter(task => task.isCompleted).length;
  const completedOptionalTasks = optionalTasks.filter(task => task.isCompleted).length;

  return (
    <main className="min-h-screen bg-[#070B16] text-white relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 animate-gradient" />
      <div className="absolute inset-0 bg-[url('/grid.png')] opacity-20" />
      
      {/* Neon glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-xl w-full space-y-8">
          {/* Header with anime character */}
          <div className="text-center relative">
            <Image
              src="/moonxbt-mascot.png"
              alt="MoonXBT Mascot"
              width={120}
              height={120}
              className="mx-auto mb-4"
            />
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              MoonXBT Airdrop
            </h1>
            <p className="text-blue-200/80">Complete tasks to earn your airdrop!</p>
          </div>

          {/* Balance card with neon effect */}
          {isConnected && balance !== null && (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative bg-[#0F1729] rounded-lg p-6 text-center">
                <p className="text-blue-300">Your $A0X Balance</p>
                <p className="text-3xl font-bold text-white">{Number(balance).toLocaleString()} A0X</p>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Required Tasks */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  Required Tasks
                </span>
              </h2>
              <div className="space-y-4">
                {requiredTasks.map((task) => (
                  <div key={task.id} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative flex items-center justify-between bg-[#0F1729] p-4 rounded-lg border border-blue-500/20">
                      <div className="flex items-center space-x-4">
                        {task.isCompleted ? (
                          <CheckCircle2 className="text-green-400 w-6 h-6" />
                        ) : (
                          <Circle className="text-blue-400/50 w-6 h-6" />
                        )}
                        <div>
                          <p className="font-medium text-blue-100">{task.title}</p>
                          <p className="text-sm text-blue-300/70">{task.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={task.action}
                        className={`${
                          task.isCompleted
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                        } border border-blue-500/30 backdrop-blur-sm transition-all duration-300`}
                        disabled={task.isCompleted}
                      >
                        {task.isCompleted ? 'Completed' : 'Complete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus Tasks */}
            <div>
              <h2 className="text-xl font-semibold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                  Bonus Tasks
                </span>
              </h2>
              <div className="space-y-4">
                {optionalTasks.map((task) => (
                  <div key={task.id} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative flex items-center justify-between bg-[#0F1729] p-4 rounded-lg border border-purple-500/20">
                      <div className="flex items-center space-x-4">
                        {task.isCompleted ? (
                          <CheckCircle2 className="text-green-400 w-6 h-6" />
                        ) : (
                          <Circle className="text-purple-400/50 w-6 h-6" />
                        )}
                        <div>
                          <p className="font-medium text-purple-100">{task.title}</p>
                          <p className="text-sm text-purple-300/70">{task.description}</p>
                        </div>
                      </div>
                      <Button
                        onClick={task.action}
                        className={`${
                          task.isCompleted
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        } border border-purple-500/30 backdrop-blur-sm transition-all duration-300`}
                        disabled={task.isCompleted}
                      >
                        {task.isCompleted ? 'Completed' : 'Complete'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress card with glass effect */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative bg-[#0F1729] rounded-lg p-6 text-center backdrop-blur-sm border border-white/10">
                <p className="text-blue-300 mb-2">Progress</p>
                <div className="space-y-2">
                  <p className="text-xl">
                    <span className="font-bold text-blue-400">{completedRequiredTasks}</span>
                    <span className="text-blue-300">/{requiredTasks.length}</span>
                    <span className="text-blue-200/80 ml-2">Required Tasks</span>
                  </p>
                  <p className="text-xl">
                    <span className="font-bold text-purple-400">{completedOptionalTasks}</span>
                    <span className="text-purple-300">/{optionalTasks.length}</span>
                    <span className="text-purple-200/80 ml-2">Bonus Tasks</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
