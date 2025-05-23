"use client";
import { Button } from "@/components/ui/Button"; // Asegúrate que esta ruta es correcta
import sdk from "@farcaster/frame-sdk";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  MessageCircle,
  Play,
  Send,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { UserContext } from "@farcaster/frame-core/dist/context";
import Image from "next/image";

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

const A0X_TOKEN_ADDRESS = "0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7";
const MIN_A0X_REQUIRED = 100;

interface Task {
  id: string;
  title: string;
  description: string;
  socialNetwork:
    | "farcaster"
    | "twitter"
    | "tiktok"
    | "instagram"
    | "telegram"
    | "a0x";
  isRequired: boolean;
  isCompleted: boolean;
  needsAuth: boolean;
  url?: string;
  icon: React.ReactNode;
  targetUsername?: string;
  verificationError?: string | null; // Para mostrar errores específicos de la tarea
}

interface VerificationResult {
  taskId: string;
  isCompleted: boolean;
  error?: string;
}

// Interface for the user information returned from our API
interface UserInfo {
  fid: number;
  username: string;
  displayName: string;
  profilePicture: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  walletAddress: string;
  twitterAccount: string | null;
  tasks: {
    [key: string]: {
      isRequired: boolean;
      isCompleted: boolean;
      verificationDetails: {
        checkedUsername: boolean;
        targetUsername: string;
        targetGroup: string;
      };
      verificationAttempts: number;
      lastVerified: string;
      completed: boolean;
      telegramUsername: string;
    };
  };
}

export default function UpdatedAirdropComponent() {
  const { address, isConnected } = useAccount(); // connector puede ser útil
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false); // Renombrado para claridad
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [user, setUser] = useState<UserContext | null>(null);
  const [isVerifyingFarcaster, setIsVerifyingFarcaster] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState<string>("");
  const [isSubmittingTwitter, setIsSubmittingTwitter] = useState(false);
  const [showTwitterInput, setShowTwitterInput] = useState(false);

  const [instagramUsername, setInstagramUsername] = useState<string>("");
  const [isSubmittingInstagram, setIsSubmittingInstagram] = useState(false);
  const [showInstagramInput, setShowInstagramInput] = useState(false);

  const [tiktokUsername, setTiktokUsername] = useState<string>("");
  const [isSubmittingTiktok, setIsSubmittingTiktok] = useState(false);
  const [showTiktokInput, setShowTiktokInput] = useState(false);

  const [telegramUsername, setTelegramUsername] = useState<string>("");
  const [isSubmittingTelegram, setIsSubmittingTelegram] = useState(false);
  const [showTelegramInput, setShowTelegramInput] = useState(false);

  const {
    data: tokenBalanceData,
    isLoading: isLoadingTokenBalance,
    error: tokenBalanceError,
  } = useReadContract({
    address: A0X_TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 15000, // Opcional: refrescar balance periódicamente
    },
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Hide splash screen when component mounts
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    const viewProfile = async () => {
      const context = await sdk.context;
      const user = context?.user;
      if (user) {
        setUser(user);
        // Verify if the user follows the target account when we get the FID
        if (user.fid) {
          verifyFarcasterFollow(user.fid);
        }
      }
    };
    viewProfile();
  }, []);

  // Function to verify if the user follows the target account on Farcaster
  const verifyFarcasterFollow = async (fid: number) => {
    // Find the Farcaster task
    const farcasterTask = tasks.find((task) => task.id === "follow-farcaster");
    if (!farcasterTask || !farcasterTask.targetUsername) return;

    setIsVerifyingFarcaster(true);
    try {
      // Call our API to verify follow status
      const response = await fetch(
        `/api/verify-follow?fid=${fid}&targetUsername=${farcasterTask.targetUsername}`
      );

      if (response.ok) {
        const data = await response.json();

        // Save full user info
        setUserInfo(data);

        // Initialize participant
        if (data.fid && data.username) {
          try {
            const initResponse = await fetch(
              "/api/a0x-framework/airdrop/initialize-participant",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: data.fid,
                  username: data.username,
                  displayName: data.displayName,
                  pfpUrl: data.profilePicture, // Asegúrate que el nombre del campo coincida
                  isFollowingFarcaster: data.isFollowing,
                  walletAddress: data.walletAddress,
                  // twitterAccount: data.twitterAccount, // Descomentar si se envía
                  // walletAddress: address, // Descomentar si se envía y está disponible
                }),
              }
            );
            if (!initResponse.ok) {
              console.error(
                "Error initializing participant:",
                await initResponse.json()
              );
            }
          } catch (initError) {
            console.error("Error initializing participant:", initError);
          }
        }

        // Update task status based on follow status
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === "follow-farcaster") {
              return {
                ...task,
                isCompleted: data.isFollowing,
                verificationError: data.isFollowing
                  ? null
                  : "You're not following this account yet.",
              };
            }

            if (task.id === "follow-twitter" && data.twitterAccount) {
              return {
                ...task,
                isCompleted: data.isFollowing,
                verificationError: data.isFollowing
                  ? null
                  : "You're not following this account yet.",
              };
            }
            return task;
          })
        );
      } else {
        // Handle error
        const errorData = await response.json();
        console.error("Error verifying Farcaster follow:", errorData);

        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-farcaster"
              ? {
                  ...task,
                  verificationError:
                    "Error verifying follow status. Please try again.",
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Error verifying Farcaster follow:", error);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-farcaster"
            ? {
                ...task,
                verificationError: "Network error verifying follow status.",
              }
            : task
        )
      );
    } finally {
      setIsVerifyingFarcaster(false);
    }
  };

  // Initialize tasks
  useEffect(() => {
    setTasks([
      {
        id: "hold-a0x",
        title: "Hold A0X Tokens",
        description: `Hold at least ${MIN_A0X_REQUIRED} A0X tokens`,
        socialNetwork: "a0x",
        isRequired: true,
        isCompleted: false,
        needsAuth: false,
        icon: <Circle className="w-5 h-5 text-yellow-500" />,
        verificationError: null,
      },
      {
        id: "follow-farcaster",
        title: "Follow on Farcaster",
        description: "Follow @ai420z",
        socialNetwork: "farcaster",
        isRequired: true,
        isCompleted: false,
        needsAuth: true,
        url: "https://warpcast.com/ai420z",
        targetUsername: "ai420z",
        icon: <MessageCircle className="w-5 h-5 text-purple-500" />,
        verificationError: null,
      },
      {
        id: "follow-twitter",
        title: "Follow on X (Twitter)",
        description: "Follow @moonXBT_ai",
        socialNetwork: "twitter",
        isRequired: true,
        isCompleted: false,
        needsAuth: true,
        url: "https://x.com/moonXBT_ai",
        targetUsername: "moonXBT_ai",
        icon: <X className="w-5 h-5 text-blue-400" />,
        verificationError: null,
      },
      {
        id: "follow-tiktok",
        title: "Follow on TikTok (Optional)",
        description: "Follow @moonxbt.fun",
        socialNetwork: "tiktok",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://www.tiktok.com/@moonxbt.fun",
        icon: <Play className="w-5 h-5 text-red-500" />,
        verificationError: null,
        targetUsername: "@moonxbt.fun",
      },
      {
        id: "follow-instagram",
        title: "Follow on Instagram (Optional)",
        description: "Follow @moonxbt_ai",
        socialNetwork: "instagram",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://www.instagram.com/moonxbt_ai/",
        icon: (
          <svg
            role="img"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-pink-500"
          >
            <title>Instagram</title>
            <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
          </svg>
        ),
        verificationError: null,
        targetUsername: "moonxbt_ai",
      },
      {
        id: "join-telegram",
        title: "Join Telegram (Optional)",
        description: "Join A0X Portal group",
        socialNetwork: "telegram",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://t.me/A0X_Portal",
        icon: <Send className="w-5 h-5 text-blue-500" />,
        verificationError: null,
        targetUsername: "A0X_Portal",
      },
    ]);
  }, []);

  // When tasks change and we have a user with FID, verify the follow
  useEffect(() => {
    if (user?.fid && tasks.length > 0) {
      verifyFarcasterFollow(user.fid);
    }
  }, [tasks.length, user?.fid]);

  // Update balance and A0X task
  useEffect(() => {
    if (tokenBalanceData) {
      const balanceNum = Number(formatEther(tokenBalanceData));
      setBalance(balanceNum.toString());

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "hold-a0x"
            ? {
                ...task,
                isCompleted: balanceNum >= MIN_A0X_REQUIRED,
                verificationError: null,
              }
            : task
        )
      );
    } else if (tokenBalanceError) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "hold-a0x"
            ? {
                ...task,
                isCompleted: false,
                verificationError: "Error fetching balance.",
              }
            : task
        )
      );
    }
  }, [tokenBalanceData, tokenBalanceError, address]);

  // Verify all tasks when session, wallet, or balance changes
  // Only if there's a session, wallet connected, and balance available
  useEffect(() => {
    if (address && balance !== null) {
      verifyAllTasks();
    }
  }, [address, balance]); // `session` object itself can cause too many re-renders if not careful

  const verifyAllTasks = async () => {
    if (!address || balance === null) {
      // Don't verify if no wallet, balance or session
      // You might want to update task errors to "Wallet not connected" or "Sign in needed"
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.needsAuth) {
            return { ...task, verificationError: "Sign in to verify." };
          }
          if (task.id === "hold-a0x" && !isConnected) {
            return { ...task, verificationError: "Connect wallet to verify." };
          }
          return task;
        })
      );
      return;
    }

    setIsVerifyingAll(true);
    try {
      const responseMock = {
        ok: true,
        json: async () => ({
          results: [
            {
              fid: 783978,
              taskId: "follow-farcaster",
              username: "matiasp",
              displayName: "Matias",
              isFollowing: true,
              isCompleted: true,
              twitterAccount: null,
              targetUsername: "ai420z",
            },
          ],
          eligibleForAirdrop: true,
        }),
      };

      // const response = await fetch("/api/verify-all-tasks", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     walletAddress: address,
      //     tokenBalance: Number(balance), // Backend already verifies it, but we send it
      //   }),
      // });

      if (responseMock.ok) {
        const data = await responseMock.json();
        updateTasksFromVerification(data.results);
        if (data.eligibleForAirdrop) {
          // Optional: you could set a state here if you want
        }
      } else {
        // General verification API error
        const errorData = await responseMock.json();
        console.error("verify-all-tasks API error:", errorData);
        // You could mark all uncompleted tasks with a generic error
        setTasks((prevTasks) =>
          prevTasks.map((t) => ({
            ...t,
            verificationError: t.isCompleted
              ? null
              : "Verification failed. Please try again.",
          }))
        );
      }
    } catch (error) {
      console.error("Task verification failed:", error);
      setTasks((prevTasks) =>
        prevTasks.map((t) => ({
          ...t,
          verificationError: t.isCompleted
            ? null
            : "Network error during verification.",
        }))
      );
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const updateTasksFromVerification = (results: VerificationResult[]) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        const result = results.find((r) => r.taskId === task.id);
        if (result) {
          return {
            ...task,
            isCompleted: result.isCompleted,
            verificationError: result.error || null,
          };
        }
        // If a task is not in the results (e.g. 'hold-a0x' which is handled locally)
        // maintain its state, but clear the error if the API didn't return one
        if (task.id === "hold-a0x") return task; // Already handled by balance useEffect
        return { ...task, verificationError: null }; // Clear errors if API didn't report for this task
      })
    );
  };

  const handleExternalLink = (url: string) => {
    sdk.actions.openUrl(url);
    // For tasks that can't be automatically verified (TikTok, Instagram, Telegram),
    // we could mark them as "attempted" or "manually completed" if desired.
    // For now, we don't change their `isCompleted` state here.
    // If you want the user to mark them manually:
    // if (taskId) {
    //   setTasks(prevTasks => prevTasks.map(task =>
    //     task.id === taskId ? { ...task, isCompleted: true } : task
    //   ));
    // }
  };

  // Function to manually verify a Farcaster follow task
  const handleVerifyFarcasterFollow = () => {
    if (user?.fid) {
      verifyFarcasterFollow(user.fid);
    } else {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-farcaster"
            ? {
                ...task,
                verificationError:
                  "You need to authenticate with Farcaster first.",
              }
            : task
        )
      );
    }
  };

  const renderTaskButton = (task: Task) => {
    if (task.socialNetwork === "a0x") {
      return (
        <div className="flex flex-col items-end space-y-1 text-right">
          {isLoadingTokenBalance && (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          )}
          {!isLoadingTokenBalance && (
            <>
              <span
                className={`text-sm font-medium ${
                  task.isCompleted
                    ? "text-green-400"
                    : balance !== null
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {balance !== null
                  ? `${Number(balance).toLocaleString()} / ${MIN_A0X_REQUIRED}`
                  : isConnected
                  ? "Loading..."
                  : "Wallet not connected"}{" "}
                A0X
              </span>
              {task.isCompleted && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {task.verificationError && (
                <span className="text-xs text-red-400">
                  {task.verificationError}
                </span>
              )}
            </>
          )}
        </div>
      );
    }

    if (task.needsAuth) {
      // For Farcaster tasks
      if (task.id === "follow-farcaster") {
        return (
          <div className="flex flex-col items-end space-y-1 text-right">
            <div className="flex items-center space-x-2">
              {isVerifyingFarcaster ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : task.isCompleted ? (
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-400">Following</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-red-400">Not following</span>
                  <Button
                    onClick={() => handleExternalLink(task.url!)}
                    className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                    title={`Open ${task.socialNetwork} to follow`}
                  >
                    Follow <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button
                    onClick={handleVerifyFarcasterFollow}
                    className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                    disabled={isVerifyingFarcaster || !user?.fid}
                    title="Verify following"
                  >
                    Verify
                  </Button>
                </div>
              )}
            </div>
            {task.verificationError && (
              <span className="text-xs text-red-400">
                {task.verificationError}
              </span>
            )}
          </div>
        );
      }

      // For Twitter tasks
      if (task.id === "follow-twitter") {
        // If there's a linked Twitter account
        if (userInfo?.twitterAccount) {
          return (
            <div className="flex flex-col items-end space-y-1 text-right">
              <div className="flex items-center space-x-2">
                {isVerifyingAll && !task.isCompleted ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : task.isCompleted ? (
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-400">Following</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-400">
                      @{userInfo?.twitterAccount}
                    </span>
                    <Button
                      onClick={() => handleExternalLink(task.url!)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                      title={`Open Twitter to follow`}
                    >
                      Follow <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
              {task.verificationError && (
                <span className="text-xs text-red-400">
                  {task.verificationError}
                </span>
              )}
            </div>
          );
        }
        // If there's no linked Twitter account
        else {
          return (
            <div className="flex flex-col items-end space-y-1 text-right">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() =>
                    handleExternalLink(
                      "https://warpcast.com/~/settings/verification"
                    )
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1 text-white"
                  title="Verify on Warpcast"
                >
                  Verify on Warpcast <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
                <Button
                  onClick={() => setShowTwitterInput(!showTwitterInput)}
                  className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1 rounded-full text-white"
                  title="Add manually"
                >
                  {showTwitterInput ? (
                    <X className="w-3 h-3" />
                  ) : (
                    <span>+</span>
                  )}
                </Button>
              </div>

              {showTwitterInput && (
                <div className="mt-2 flex items-center space-x-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="@username"
                    value={twitterUsername}
                    onChange={(e) =>
                      setTwitterUsername(e.target.value.replace("@", ""))
                    }
                    className="bg-gray-700 text-white text-xs rounded px-2 py-1 flex-grow max-w-[120px]"
                  />
                  <Button
                    onClick={() => {
                      if (twitterUsername) {
                        handleSubmitTwitterUsername(twitterUsername);
                      }
                    }}
                    disabled={isSubmittingTwitter || !twitterUsername}
                    className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                  >
                    {isSubmittingTwitter ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-1">
                <span className="text-xs text-gray-400">
                  X account not linked
                </span>
              </div>

              {task.verificationError && (
                <span className="text-xs text-red-400">
                  {task.verificationError}
                </span>
              )}
            </div>
          );
        }
      }

      // For other tasks requiring authentication
      return (
        <div className="flex flex-col items-end space-y-1 text-right">
          <div className="flex items-center space-x-2">
            {isVerifyingAll && !task.isCompleted ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : task.isCompleted ? (
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-400">Following</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-red-400">Not following</span>
                <Button
                  onClick={() => handleExternalLink(task.url!)}
                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                  title={`Open ${task.socialNetwork} to follow`}
                >
                  Follow <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
          {task.verificationError && (
            <span className="text-xs text-red-400">
              {task.verificationError}
            </span>
          )}
        </div>
      );
    }

    // Tasks that only require an external link (TikTok, Instagram, Telegram)
    if (
      task.id === "follow-tiktok" ||
      task.id === "follow-instagram" ||
      task.id === "join-telegram"
    ) {
      const isInstagram = task.id === "follow-instagram";
      const isTiktok = task.id === "follow-tiktok";
      // const isTelegram = task.id === 'join-telegram'; // No es necesaria directamente

      const showInput = isInstagram
        ? showInstagramInput
        : isTiktok
        ? showTiktokInput
        : showTelegramInput;
      const setShowInput = isInstagram
        ? setShowInstagramInput
        : isTiktok
        ? setShowTiktokInput
        : setShowTelegramInput;
      const username = isInstagram
        ? instagramUsername
        : isTiktok
        ? tiktokUsername
        : telegramUsername;
      const setUsername = isInstagram
        ? setInstagramUsername
        : isTiktok
        ? setTiktokUsername
        : setTelegramUsername;
      const handleSubmit = isInstagram
        ? handleRegisterInstagramTask
        : isTiktok
        ? handleRegisterTiktokTask
        : handleRegisterTelegramTask;
      const isSubmitting = isInstagram
        ? isSubmittingInstagram
        : isTiktok
        ? isSubmittingTiktok
        : isSubmittingTelegram;
      const socialName = isInstagram
        ? "Instagram"
        : isTiktok
        ? "TikTok"
        : "Telegram";

      const previousUsername: string | null =
        isTiktok || isInstagram
          ? userInfo?.tasks?.[task.id]?.verificationDetails?.checkedUsername
            ? String(
                userInfo.tasks[task.id].verificationDetails.checkedUsername
              )
            : null
          : userInfo?.tasks?.[task.id]?.telegramUsername
          ? String(userInfo.tasks[task.id].telegramUsername)
          : null;

      return (
        <div className="flex flex-col items-end space-y-1 text-right">
          {!task.isCompleted && (
            <div className="flex items-center space-x-2">
              {isTiktok && previousUsername && (
                <span className="text-xs text-gray-400">
                  {previousUsername}
                </span>
              )}
              {isInstagram && previousUsername && (
                <span className="text-xs text-gray-400">
                  {previousUsername}
                </span>
              )}
              {!isTiktok && !isInstagram && userInfo && previousUsername && (
                <span className="text-xs text-gray-400">
                  {previousUsername}
                </span>
              )}
              <Button
                onClick={() => handleExternalLink(task.url!)}
                className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1 text-white"
                title={`Open ${socialName}`}
              >
                Open Link <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
              <Button
                onClick={() => {
                  setShowInput(!showInput);
                  if (previousUsername) {
                    setUsername(previousUsername);
                  }
                }}
                className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1 rounded-full text-white"
                title={`Add ${socialName} username manually`}
                disabled={!user?.fid}
              >
                {showInput ? <X className="w-3 h-3" /> : <span>+</span>}
              </Button>
            </div>
          )}

          {showInput && !task.isCompleted && (
            <div className="mt-2 flex items-center space-x-2 animate-fade-in w-full justify-end">
              <input
                type="text"
                placeholder={`@${socialName} username`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                className="bg-gray-700 text-white text-xs rounded px-2 py-1 flex-grow max-w-[150px] sm:max-w-[120px]"
              />
              <Button
                onClick={() => {
                  if (username || !showInput) {
                    handleSubmit(username);
                  }
                }}
                disabled={isSubmitting || !username || !user?.fid}
                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          )}

          {task.isCompleted && (
            <div className="flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-400">Completed</span>
            </div>
          )}
          {task.verificationError && (
            <span className="text-xs text-red-400 mt-1 text-right w-full">
              {task.verificationError}
            </span>
          )}
        </div>
      );
    }

    // Fallback para otras tareas no autenticadas (si las hubiera)
    return (
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleExternalLink(task.url!)}
            className="bg-gray-600 hover:bg-gray-700 text-sm px-3 py-1 text-white"
          >
            Open Link <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          {task.isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
        {task.verificationError && (
          <span className="text-xs text-red-400">{task.verificationError}</span>
        )}
      </div>
    );
  };

  const requiredTasks = tasks.filter((task) => task.isRequired);
  const optionalTasks = tasks.filter((task) => !task.isRequired);
  const completedRequiredTasksCount = requiredTasks.filter(
    (task) => task.isCompleted
  ).length;
  const allRequiredCompleted =
    isClient &&
    isConnected &&
    completedRequiredTasksCount === requiredTasks.length;

  const handleClaimAirdrop = async () => {
    if (!allRequiredCompleted) {
      setClaimMessage("Please complete all required tasks first.");
      return;
    }
    setIsClaiming(true);
    setClaimMessage(null);
    // Here would be the logic to call your backend and register the claim
    // For example:
    // try {
    //   const response = await fetch('/api/claim-airdrop', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ walletAddress: address })
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     setClaimMessage(`Airdrop claimed successfully! Transaction: ${data.txHash}`);
    //   } else {
    //     setClaimMessage(`Error: ${data.message || 'Failed to claim airdrop.'}`);
    //   }
    // } catch (error) {
    //   setClaimMessage("An error occurred while claiming. Please try again.");
    // } finally {
    //   setIsClaiming(false);
    // }

    // Placeholder:
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setClaimMessage(
      "Airdrop claim initiated! (This is a demo, no actual claim processed)"
    );
    setIsClaiming(false);
  };

  // Button to refresh verifications
  const refreshButton = (
    <Button
      onClick={verifyAllTasks}
      disabled={isVerifyingAll || !isConnected || balance === null}
      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
    >
      {isVerifyingAll ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Tasks...
        </>
      ) : (
        "Refresh All Task Verifications"
      )}
    </Button>
  );

  // Function to handle Twitter username submission
  const handleSubmitTwitterUsername = async (username: string) => {
    if (!username || !user?.fid || !userInfo) return;

    setIsSubmittingTwitter(true);
    try {
      // Call API to verify Twitter follow manually
      const response = await fetch(
        "/api/a0x-framework/airdrop/verify-twitter-follow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: user.fid,
            twitterUsername: username,
            targetTwitterUsername: tasks.find((t) => t.id === "follow-twitter")
              ?.targetUsername,
            walletAddress: userInfo.walletAddress,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserInfo((prevUserInfo) => {
          if (prevUserInfo && data.dataReceived.twitterAccount) {
            return {
              ...prevUserInfo,
              twitterAccount: data.dataReceived.twitterAccount,
            };
          }
          return prevUserInfo;
        });
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === "follow-twitter") {
              return {
                ...task,
                isCompleted: data.dataReceived.isFollowing,
                verificationError: data.dataReceived.isFollowing
                  ? null
                  : "You're not following this account on X.",
              };
            }
            return task;
          })
        );
        // Hide input field if successful
        if (data.dataReceived.isFollowing) {
          setShowTwitterInput(false);
        }
      } else {
        const errorData = await response.json();
        console.error("Error verifying Twitter follow:", errorData);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-twitter"
              ? {
                  ...task,
                  verificationError: "Verification failed. Please try again.",
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Error verifying Twitter follow:", error);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-twitter"
            ? {
                ...task,
                verificationError: "Network error during verification.",
              }
            : task
        )
      );
    } finally {
      setIsSubmittingTwitter(false);
    }
  };

  const handleRegisterInstagramTask = async (usernameValue?: string) => {
    if (!user?.fid) {
      console.log("User FID not available to register Instagram task");
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-instagram"
            ? { ...task, verificationError: "Sign in with Farcaster first." }
            : task
        )
      );
      return;
    }
    if (!usernameValue && showInstagramInput) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-instagram"
            ? { ...task, verificationError: "Instagram username is required." }
            : task
        )
      );
      return;
    }

    setIsSubmittingInstagram(true);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === "follow-instagram"
          ? { ...task, verificationError: null }
          : task
      )
    );

    try {
      const response = await fetch(
        "/api/a0x-framework/airdrop/task/instagram",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farcasterFid: user.fid,
            instagramUsername: usernameValue,
            targetInstagramUsername: tasks.find(
              (t) => t.id === "follow-instagram"
            )?.targetUsername,
          }),
        }
      );

      if (response.ok) {
        console.log("Instagram task registered with username:", usernameValue);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-instagram"
              ? {
                  ...task,
                  isCompleted: true,
                  verificationError: null,
                  // Opcional: actualizar descripción o añadir un campo para el username enviado
                  // description: usernameValue ? `Username @${usernameValue} submitted.` : task.description
                }
              : task
          )
        );
        setShowInstagramInput(false);
        setInstagramUsername(""); // Limpiar input
      } else {
        const errorData = await response.json();
        console.error("Error registering Instagram task:", errorData);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-instagram"
              ? {
                  ...task,
                  verificationError:
                    errorData.details ||
                    "Failed to register. Please try again.",
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Error registering Instagram task:", error);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-instagram"
            ? { ...task, verificationError: "Network error. Please try again." }
            : task
        )
      );
    } finally {
      setIsSubmittingInstagram(false);
    }
  };

  const handleRegisterTiktokTask = async (usernameValue?: string) => {
    if (!user?.fid) {
      console.log("User FID not available to register TikTok task");
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-tiktok"
            ? { ...task, verificationError: "Sign in with Farcaster first." }
            : task
        )
      );
      return;
    }
    if (!usernameValue && showTiktokInput) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-tiktok"
            ? { ...task, verificationError: "TikTok username is required." }
            : task
        )
      );
      return;
    }

    setIsSubmittingTiktok(true);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === "follow-tiktok"
          ? { ...task, verificationError: null }
          : task
      )
    );

    try {
      const response = await fetch("/api/a0x-framework/airdrop/task/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farcasterFid: user.fid,
          tiktokUsername: usernameValue,
          targetTiktokUsername: tasks.find((t) => t.id === "follow-tiktok")
            ?.targetUsername,
        }),
      });

      if (response.ok) {
        console.log("TikTok task registered with username:", usernameValue);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-tiktok"
              ? {
                  ...task,
                  isCompleted: true,
                  verificationError: null,
                  // Opcional: actualizar descripción
                  // description: usernameValue ? `Username @${usernameValue} submitted.` : task.description
                }
              : task
          )
        );
        setShowTiktokInput(false);
        setTiktokUsername(""); // Limpiar input
      } else {
        const errorData = await response.json();
        console.error("Error registering TikTok task:", errorData);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "follow-tiktok"
              ? {
                  ...task,
                  verificationError:
                    errorData.details ||
                    "Failed to register. Please try again.",
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Error registering TikTok task:", error);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "follow-tiktok"
            ? { ...task, verificationError: "Network error. Please try again." }
            : task
        )
      );
    } finally {
      setIsSubmittingTiktok(false);
    }
  };

  const handleRegisterTelegramTask = async (usernameValue?: string) => {
    if (!user?.fid) {
      console.log("User FID not available to register Telegram task");
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "join-telegram"
            ? { ...task, verificationError: "Sign in with Farcaster first." }
            : task
        )
      );
      return;
    }
    // Considerar si el username es obligatorio cuando el input está visible
    if (!usernameValue && showTelegramInput) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "join-telegram"
            ? { ...task, verificationError: "Telegram username is required." }
            : task
        )
      );
      return;
    }

    setIsSubmittingTelegram(true);
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === "join-telegram"
          ? { ...task, verificationError: null }
          : task
      )
    );

    try {
      const response = await fetch("/api/a0x-framework/airdrop/task/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farcasterFid: user.fid,
          telegramUsername: usernameValue,
          targetTelegramGroup: tasks.find((t) => t.id === "join-telegram")
            ?.targetUsername,
        }),
      });

      if (response.ok) {
        console.log("Telegram task registered with username:", usernameValue);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "join-telegram"
              ? {
                  ...task,
                  isCompleted: true,
                  verificationError: null,
                  // description: usernameValue ? `Username @${usernameValue} submitted.` : task.description
                }
              : task
          )
        );
        setShowTelegramInput(false);
        setTelegramUsername("");
      } else {
        const errorData = await response.json();
        console.error("Error registering Telegram task:", errorData);
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === "join-telegram"
              ? {
                  ...task,
                  verificationError:
                    errorData.details ||
                    "Failed to register. Please try again.",
                }
              : task
          )
        );
      }
    } catch (error) {
      console.error("Error registering Telegram task:", error);
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "join-telegram"
            ? { ...task, verificationError: "Network error. Please try again." }
            : task
        )
      );
    } finally {
      setIsSubmittingTelegram(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-lg w-full space-y-6 bg-gray-800/50 backdrop-blur-md p-6 rounded-xl shadow-2xl">
        {/* Animated background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 animate-gradient -z-10" />
        <div className="absolute inset-0 bg-[url('/grid.png')] opacity-20 -z-10" />

        {/* Neon glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 py-4 flex flex-col items-center justify-center">
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
              <p className="text-blue-200/80">
                Complete tasks to earn your airdrop!
              </p>
            </div>

            {/* Balance card with neon effect */}
            {isConnected && balance !== null && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                <div className="relative bg-[#0F1729] rounded-lg p-6 text-center">
                  <p className="text-blue-300">Your $A0X Balance</p>
                  <p className="text-3xl font-bold text-white">
                    {Number(balance).toLocaleString()} A0X
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wallet & Session Status */}
        <div className="bg-gray-700/50 rounded-lg p-4 space-y-3 z-10">
          {/* Farcaster User Info */}
          {user && (
            <div className="bg-purple-900/30 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-300 flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Farcaster User:
                </span>
                <span className="text-white font-medium flex items-center">
                  {user.username && (
                    <>
                      {user.pfpUrl && (
                        <Image
                          src={user.pfpUrl}
                          alt={user.username}
                          width={24}
                          height={24}
                          className="rounded-full mr-2"
                        />
                      )}
                      @{user.username}
                    </>
                  )}
                </span>
              </div>

              {/* {userInfo.twitterAccount && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300 flex items-center">
                    <Twitter className="w-3 h-3 mr-1" />
                    Connected Twitter:
                  </span>
                  <span className="text-blue-200">
                    @{userInfo.twitterAccount.username}
                  </span>
                </div>
              )} */}
            </div>
          )}

          {/* Task Sections */}
          {["Required", "Optional"].map((type) => {
            const taskList =
              type === "Required" ? requiredTasks : optionalTasks;
            if (taskList.length === 0) return null;
            return (
              <div key={type} className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2 mb-3">
                  {type} Tasks
                </h2>
                {taskList.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-gray-700/60 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0
                              ${
                                task.isCompleted
                                  ? "border-l-4 border-green-500"
                                  : task.verificationError
                                  ? "border-l-4 border-red-500"
                                  : "border-l-4 border-gray-600"
                              }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="mt-1">{task.icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-50">
                          {task.title}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {task.description}
                        </p>
                      </div>
                    </div>
                    <div className="sm:min-w-[180px] sm:text-right">
                      {" "}
                      {/* Ensure button area has enough space */}
                      {renderTaskButton(task)}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Refresh Button - only show if there are tasks that need auth and session or wallet */}
          {(tasks.some((t) => t.needsAuth) ||
            tasks.some((t) => t.id === "hold-a0x")) &&
            refreshButton}

          {/* Eligibility & Claim */}
          <div
            className={`rounded-lg p-4 text-center border-2 ${
              allRequiredCompleted
                ? "bg-green-900/30 border-green-500"
                : isConnected
                ? "bg-yellow-900/30 border-yellow-500"
                : "bg-gray-700/30 border-gray-500"
            }`}
          >
            <h2 className="text-lg font-bold mb-2">
              {allRequiredCompleted
                ? "🎉 You are Eligible for the Airdrop!"
                : isConnected
                ? "Almost there!"
                : "Connect and Sign In to Check Eligibility"}
            </h2>
            <p className="text-sm text-gray-300 mb-3">
              {isConnected
                ? `${completedRequiredTasksCount} / ${requiredTasks.length} required tasks completed.`
                : "Please connect your wallet and sign in with your social accounts."}
            </p>

            {allRequiredCompleted && (
              <Button
                onClick={handleClaimAirdrop}
                disabled={isClaiming}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : (
                  "Claim Your Airdrop Now!"
                )}
              </Button>
            )}
            {claimMessage && (
              <p
                className={`mt-3 text-sm ${
                  claimMessage.includes("Error") ||
                  claimMessage.includes("Failed")
                    ? "text-red-400"
                    : "text-green-400"
                }`}
              >
                {claimMessage}
              </p>
            )}
            {!allRequiredCompleted &&
              isConnected &&
              requiredTasks.length > 0 && (
                <p className="text-xs text-yellow-300 mt-2">
                  Complete all required tasks above to enable the claim button.
                </p>
              )}
          </div>
        </div>
      </div>
    </main>
  );
}
