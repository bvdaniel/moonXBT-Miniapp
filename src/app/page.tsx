"use client"

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/frame-sdk';
import { Button } from '@/components/ui/Button';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { CheckCircle2, Circle } from 'lucide-react';

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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">MoonXBT Airdrop</h1>
          <p className="text-gray-400">Complete tasks to earn your airdrop!</p>
        </div>

        {isConnected && balance !== null && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 text-center">
            <p className="text-gray-400">Your $A0X Balance</p>
            <p className="text-2xl font-bold">{Number(balance).toLocaleString()} A0X</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Required Tasks</h2>
            <div className="space-y-3">
              {requiredTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {task.isCompleted ? (
                      <CheckCircle2 className="text-green-500" />
                    ) : (
                      <Circle className="text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-400">{task.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={task.action}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={task.isCompleted}
                  >
                    {task.isCompleted ? 'Completed' : 'Complete'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Bonus Tasks</h2>
            <div className="space-y-3">
              {optionalTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {task.isCompleted ? (
                      <CheckCircle2 className="text-green-500" />
                    ) : (
                      <Circle className="text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-400">{task.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={task.action}
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={task.isCompleted}
                  >
                    {task.isCompleted ? 'Completed' : 'Complete'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400">Progress</p>
            <p className="text-xl font-bold">
              {completedRequiredTasks}/{requiredTasks.length} Required Tasks
            </p>
            <p className="text-xl font-bold">
              {completedOptionalTasks}/{optionalTasks.length} Bonus Tasks
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
