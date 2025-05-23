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
  RefreshCw,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { UserContext } from "@farcaster/frame-core/dist/context";
import Image from "next/image";
import { FaInstagram, FaTiktok, FaTelegram } from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";

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
    | "a0x"
    | "zora";
  isRequired: boolean;
  isCompleted: boolean;
  needsAuth: boolean;
  url?: string;
  icon: React.ReactNode;
  targetUsername?: string;
  verificationError?: string | null; // Para mostrar errores específicos de la tarea
  action?: () => void;
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
const asciiLogoLines = [
  "                                                /$$   /$$ /$$$$$$$  /$$$$$$$$",
  "                                               | $$  / $$| $$__  $$|__  $$__/",
  " /$$$$$$/$$$$   /$$$$$$   /$$$$$$  /$$$$$$$ |  $$/ $$/| $$    $$   | $$",
  "| $$_  $$_  $$ /$$__  $$ /$$__  $$| $$__  $$    $$$$/ | $$$$$$$    | $$",
  "| $$   $$   $$| $$    $$| $$    $$| $$    $$  >$$  $$ | $$__  $$   | $$",
  "| $$ | $$ | $$| $$  | $$| $$  | $$| $$  | $$ /$$/   $$| $$    $$   | $$",
  "| $$ | $$ | $$|  $$$$$$/|  $$$$$$/| $$  | $$| $$    $$| $$$$$$$/   | $$",
  "|__/ |__/ |__/  ______/   ______/ |__/  |__/|__/  |__/|_______/    |__/",
];

export default function UpdatedAirdropComponent() {
  const { address, isConnected } = useAccount(); // connector puede ser útil
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false); // Renombrado para claridad
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVerifyingTwitter, setIsVerifyingTwitter] = useState(false);

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
  const verifyFarcasterFollow = async (
    fid: number,
    isRefresh: boolean = false
  ) => {
    const farcasterTask = tasks.find((task) => task.id === "follow-farcaster");
    if (!farcasterTask || !farcasterTask.targetUsername) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsVerifyingFarcaster(true);
    }

    try {
      const response = await fetch(
        `/api/verify-follow?fid=${fid}&targetUsername=${farcasterTask.targetUsername}&refresh=${isRefresh}`
      );

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);

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
                  pfpUrl: data.profilePicture,
                  isFollowingFarcaster: data.isFollowing,
                  walletAddress: data.walletAddress,
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

        // Actualizar tareas
        const updatedTasks = tasks.map((task) => {
          if (task.id === "follow-farcaster") {
            return {
              ...task,
              isCompleted: data.isFollowing === true,
              verificationError:
                data.isFollowing === true
                  ? null
                  : "You're not following this account yet.",
            };
          }

          if (task.id === "follow-twitter" && data.twitterAccount) {
            if (data.tasks?.["follow-twitter"]?.completed === true) {
              return {
                ...task,
                isCompleted: true,
                verificationError: null,
              };
            }
          }
          return task;
        });

        setTasks(updatedTasks);

        // Si hay una cuenta de Twitter, verificar el seguimiento
        if (
          data.twitterAccount &&
          user?.fid &&
          data.tasks?.["follow-twitter"]?.completed !== true
        ) {
          try {
            const twitterResponse = await fetch(
              "/api/a0x-framework/airdrop/verify-twitter-follow",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: user.fid,
                  twitterUsername: data.twitterAccount,
                  targetTwitterUsername: tasks.find(
                    (t) => t.id === "follow-twitter"
                  )?.targetUsername,
                  walletAddress: data.walletAddress,
                }),
              }
            );

            if (twitterResponse.ok) {
              const twitterData = await twitterResponse.json();
              setTasks((prevTasks) =>
                prevTasks.map((task) => {
                  if (task.id === "follow-twitter") {
                    return {
                      ...task,
                      isCompleted:
                        twitterData.dataReceived.isFollowing === true,
                      verificationError:
                        twitterData.dataReceived.isFollowing === true
                          ? null
                          : "You're not following this account yet.",
                    };
                  }
                  return task;
                })
              );
            }
          } catch (error) {
            console.error("Error verifying Twitter follow:", error);
            setTasks((prevTasks) =>
              prevTasks.map((task) =>
                task.id === "follow-twitter"
                  ? {
                      ...task,
                      verificationError:
                        "Error verifying Twitter follow status.",
                    }
                  : task
              )
            );
          }
        }
      } else {
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
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsVerifyingFarcaster(false);
      }
    }
  };

  const handleRefresh = () => {
    if (user?.fid) {
      verifyFarcasterFollow(user.fid, true);
    }
  };

  const verifyTwitterFollow = async (
    fid: number,
    twitterUsername: string,
    targetUsername: string,
    walletAddress: string
  ) => {
    setIsVerifyingTwitter(true);
    try {
      const response = await fetch(
        "/api/a0x-framework/airdrop/verify-twitter-follow",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid,
            twitterUsername,
            targetTwitterUsername: targetUsername,
            walletAddress,
          }),
        }
      );
      const dataIsFollowing = await response.json();
      return {
        isCompleted: dataIsFollowing.dataReceived.isFollowing === true,
        verificationError: dataIsFollowing.dataReceived.isFollowing
          ? null
          : "You're not following this account yet.",
      };
    } catch (error) {
      console.error("Error verifying Twitter follow:", error);
      return {
        isCompleted: false,
        verificationError: "Error verifying follow status",
      };
    } finally {
      setIsVerifyingTwitter(false);
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
        url: "https://farcaster.xyz/ai420z",
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
        icon: (
          <Image
            src="/x.png"
            alt="X"
            width={20}
            height={20}
            className="inline-block mr-2"
          />
        ),
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
        description: "Follow @moonxbt",
        socialNetwork: "instagram",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://www.instagram.com/moonxbt/",
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
        targetUsername: "moonxbt",
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
      {
        id: "follow-zora",
        title: "Follow on Zora",
        description: "Follow @moonxbt_ai",
        socialNetwork: "zora",
        isRequired: false,
        isCompleted: false,
        needsAuth: false,
        url: "https://zora.co/moonxbt_ai",
        icon: (
          <Image
            src="/zora.png"
            alt="Zora"
            width={20}
            height={20}
            className="inline-block mr-2"
          />
        ),
        verificationError: null,
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
  }, [address, balance]);

  const verifyAllTasks = useCallback(async () => {
    setIsVerifyingAll(true);
    try {
      if (user?.fid) {
        // Verificar Farcaster
        await verifyFarcasterFollow(user.fid, true);

        // Si hay una cuenta de Twitter, verificar también
        if (userInfo?.twitterAccount) {
          try {
            const twitterResponse = await fetch(
              "/api/a0x-framework/airdrop/verify-twitter-follow",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fid: user.fid,
                  twitterUsername: userInfo.twitterAccount,
                  targetTwitterUsername: tasks.find(
                    (t) => t.id === "follow-twitter"
                  )?.targetUsername,
                  walletAddress: userInfo.walletAddress,
                }),
              }
            );

            if (twitterResponse.ok) {
              const twitterData = await twitterResponse.json();
              setTasks((prevTasks) =>
                prevTasks.map((task) => {
                  if (task.id === "follow-twitter") {
                    return {
                      ...task,
                      isCompleted:
                        twitterData.dataReceived.isFollowing === true,
                      verificationError:
                        twitterData.dataReceived.isFollowing === true
                          ? null
                          : "You're not following this account yet.",
                    };
                  }
                  return task;
                })
              );
            }
          } catch (error) {
            console.error("Error verifying Twitter follow:", error);
            setTasks((prevTasks) =>
              prevTasks.map((task) =>
                task.id === "follow-twitter"
                  ? {
                      ...task,
                      verificationError:
                        "Error verifying Twitter follow status.",
                    }
                  : task
              )
            );
          }
        }
      } else {
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.needsAuth) {
              return { ...task, verificationError: "Sign in to verify." };
            }
            return task;
          })
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
  }, [user?.fid, userInfo, tasks]);

  const updateTasksFromVerification = async (results: VerificationResult[]) => {
    try {
      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {
          const result = results.find((r) => r.taskId === task.id);
          if (result) {
            return {
              ...task,
              isCompleted: result.isCompleted,
              verificationError: result.error || null,
            };
          }

          if (task.id === "hold-a0x") return task;

          if (task.id === "follow-twitter" && userInfo?.twitterAccount) {
            if (userInfo.tasks["follow-twitter"]?.completed === true) {
              return {
                ...task,
                isCompleted: true,
                verificationError: null,
              };
            } else if (user?.fid) {
              try {
                const verificationResult = await verifyTwitterFollow(
                  user.fid,
                  userInfo.twitterAccount,
                  tasks.find((t) => t.id === "follow-twitter")
                    ?.targetUsername || "",
                  userInfo.walletAddress
                );
                return {
                  ...task,
                  ...verificationResult,
                };
              } catch (error) {
                console.error("Error verifying Twitter follow:", error);
                return {
                  ...task,
                  isCompleted: false,
                  verificationError: "Error verifying follow status",
                };
              }
            }
          }

          return { ...task, verificationError: null };
        })
      );

      setTasks(updatedTasks);
    } catch (error) {
      console.error("Error updating tasks:", error);
    }
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
  const handleVerifyFarcasterFollow = async () => {
    if (user?.fid) {
      await verifyFarcasterFollow(user.fid);
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

  const getTaskIcon = (id: string) => {
    switch (id) {
      case "follow-twitter":
        return (
          <Image
            src="/x.png"
            alt="X"
            width={12}
            height={12}
            className="inline-block mr-2"
          />
        );
      case "follow-zora":
        return (
          <Image
            src="/zora.png"
            alt="Zora"
            width={20}
            height={20}
            className="inline-block mr-2"
          />
        );
      case "follow-farcaster":
        return <SiFarcaster className="inline-block mr-2 text-blue-200" />;
      case "follow-tiktok":
        return <FaTiktok className="inline-block mr-2 text-blue-200" />;
      case "follow-instagram":
        return <FaInstagram className="inline-block mr-2 text-blue-200" />;
      case "join-telegram":
        return <FaTelegram className="inline-block mr-2 text-blue-200" />;
      default:
        return null;
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
                  ? `${Number(
                      balance
                    ).toLocaleString()} / ${MIN_A0X_REQUIRED} A0X`
                  : isConnected
                  ? "Loading..."
                  : "Wallet not connected"}{" "}
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
                <div className="flex items-center space-x-1 bg-green-500/20 rounded-none h-6 p-0 px-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-400">Following</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-red-400">Not following</span>
                  <Button
                    onClick={() => handleExternalLink(task.url!)}
                    className="bg-purple-600 hover:bg-purple-700 text-xs rounded-none h-6 p-0 px-1 text-white"
                    title={`Open ${task.socialNetwork} to follow`}
                  >
                    Follow <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button
                    onClick={handleVerifyFarcasterFollow}
                    className="bg-blue-600 hover:bg-blue-700 text-xs rounded-none h-6 p-0 px-1 text-white"
                    disabled={isVerifyingFarcaster || !user?.fid}
                    title="Verify following"
                  >
                    Verify
                  </Button>
                </div>
              )}
            </div>
            {/* {task.verificationError && (
              <span className="text-xs text-red-400">
                {task.verificationError}
              </span>
            )} */}
          </div>
        );
      }

      // For Twitter tasks
      if (task.id === "follow-twitter") {
        // If there's a linked Twitter account
        if (
          userInfo?.twitterAccount &&
          !isVerifyingTwitter &&
          !isVerifyingFarcaster
        ) {
          return (
            <div className="flex flex-col items-end space-y-1 text-right">
              <div className="flex items-center space-x-2">
                {isVerifyingAll && !task.isCompleted ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : task.isCompleted ? (
                  <div className="flex items-center space-x-1 bg-green-500/20 rounded-none h-6 p-0 px-1">
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
                      className="bg-blue-600 hover:bg-blue-700 text-xs rounded-none h-6 p-0 px-1 text-white"
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
              {isVerifyingTwitter || isVerifyingFarcaster ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() =>
                      handleExternalLink("https://farcaster.xyz/~/settings")
                    }
                    className="bg-purple-600 hover:bg-purple-700 text-xs h-6 p-0 px-1 rounded-none text-white"
                    title="Verify on Farcaster"
                  >
                    Verify on Farcaster{" "}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                  <Button
                    onClick={() => setShowTwitterInput(!showTwitterInput)}
                    className="bg-gray-600 hover:bg-gray-700 text-xs h-6 w-6 p-0 rounded-none text-white"
                    title="Add manually"
                  >
                    {showTwitterInput ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <span>+</span>
                    )}
                  </Button>
                  <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing || !user?.fid}
                    className="bg-gray-600 hover:bg-gray-700 text-xs h-6 w-6 p-0 rounded-none text-white"
                    title="Refresh verification"
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              )}

              {showTwitterInput && (
                <div className="mt-2 flex items-center space-x-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="@username"
                    value={twitterUsername}
                    onChange={(e) =>
                      setTwitterUsername(e.target.value.replace("@", ""))
                    }
                    className="bg-gray-700 text-white text-xs rounded-none px-2 py-1 flex-grow max-w-[120px]"
                  />
                  <Button
                    onClick={() => {
                      if (twitterUsername) {
                        handleSubmitTwitterUsername(twitterUsername);
                      }
                    }}
                    disabled={isSubmittingTwitter || !twitterUsername}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-6 p-0 px-1 rounded-none text-white"
                  >
                    {isSubmittingTwitter ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              )}

              {!isVerifyingTwitter && !isVerifyingFarcaster && (
                <div className="mt-1">
                  <span className="text-xs text-gray-400">
                    X account not linked
                  </span>
                </div>
              )}

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
            ) : !isVerifyingTwitter ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-400">
                  Verifying Twitter...
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-red-400">Not following</span>
                <Button
                  onClick={() => handleExternalLink(task.url!)}
                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1 text-white"
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
                <span className="text-xs text-gray-300">
                  @{previousUsername}
                </span>
              )}
              {isInstagram && previousUsername && (
                <span className="text-xs text-gray-300">
                  @{previousUsername}
                </span>
              )}
              {!isTiktok && !isInstagram && userInfo && previousUsername && (
                <span className="text-xs text-gray-300">
                  @{previousUsername}
                </span>
              )}
              <Button
                onClick={() => handleExternalLink(task.url!)}
                className="bg-gray-600 hover:bg-gray-700 text-xs p-0 px-1 h-6 text-white rounded-none"
                title={`Open ${socialName}`}
                size="sm"
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
                className="bg-gray-600 hover:bg-gray-700 text-xs text-white rounded-none h-6 w-6 p-0"
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
                className="bg-blue-600 hover:bg-blue-700 text-xs h-6 p-0 px-1 rounded-none text-white"
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
            className="bg-gray-600 hover:bg-gray-700 text-sm p-0 px-1 h-6 text-white rounded-none"
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
  const completedRequiredTasks = requiredTasks.filter(
    (task) => task.isCompleted
  ).length;
  const completedOptionalTasks = optionalTasks.filter(
    (task) => task.isCompleted
  ).length;

  const [asciiLinesToShow, setAsciiLinesToShow] = useState(0);

  useEffect(() => {
    setAsciiLinesToShow(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAsciiLinesToShow(i);
      if (i >= asciiLogoLines.length) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Restore all variables and functions from the main repo:
  const allRequiredCompleted =
    isClient && isConnected && completedRequiredTasks === requiredTasks.length;

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

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
      // disabled={isVerifyingAll || !isConnected || balance === null} // TODO: Uncomment this when we have a balance check
      disabled={isVerifyingAll}
      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 border-white/30 border rounded-none text-white"
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
                isCompleted: data.dataReceived.isFollowing === true,
                verificationError:
                  data.dataReceived.isFollowing === true
                    ? null
                    : "You're not following this account on X.",
              };
            }
            return task;
          })
        );
        if (data.dataReceived.isFollowing === true) {
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
            instagramUsername: usernameValue?.replace("@", ""),
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
          tiktokUsername: usernameValue?.replace("@", ""),
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
          telegramUsername: usernameValue?.replace("@", ""),
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
    <main className="min-h-screen bg-[#1752F0] text-white font-mono relative overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0 z-0 w-full h-full overflow-hidden pointer-events-none">
        <video
          src="/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="scanline pointer-events-none absolute inset-0 z-10" />
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-2 sm:px-4 py-4">
        <div className="relative w-full flex justify-center items-center">
          <pre className="text-white text-[5px] sm:text-[7px] leading-none mb-1 select-none text-center drop-shadow-[0_0_2px_white] font-mono tracking-widest overflow-x-auto whitespace-pre max-w-full">
            {asciiLogoLines.slice(0, asciiLinesToShow).join("\n")}
          </pre>
        </div>
        <div className="w-full max-w-xs sm:max-w-sm space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-base sm:text-lg font-bold mb-1 tracking-widest text-white drop-shadow-[0_0_2px_white]">
              AIRDROP
            </h1>
            <p className="text-blue-100 text-[11px] sm:text-xs tracking-wide">
              Complete tasks to earn your airdrop!
            </p>
          </div>
          {isConnected && balance !== null && (
            <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 my-1 relative text-center w-full">
              <div className="font-mono text-white text-lg">
                <span className="text-blue-200">Your $A0X Balance:</span>
                <span className="ml-2 text-white font-bold">
                  {Number(balance).toLocaleString()} A0X
                </span>
              </div>
            </div>
          )}

          {/* Farcaster User Info */}
          {/* {user && (
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

            </div>
          )} */}

          {/* Task Sections */}
          {/* {["Required", "Optional"].map((type) => {
            const taskList =
              type === "Required" ? requiredTasks : optionalTasks;
            if (taskList.length === 0) return null;
            return (
              <div key={type} className="space-y-3">
                <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2 mb-3">
                  {type} Tasks</h2>
                  </div>)} */}

          <div className="space-y-8">
            <div>
              <div className="relative flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold mb-1 text-white border-b border-white/30 pb-1 tracking-widest">
                  REQUIRED TASKS
                </h2>
                <Image
                  src="/moon_mini.png"
                  alt="Moon"
                  className="w-12 h-12 animate-bob pointer-events-none neon-moon"
                  width={48}
                  height={48}
                  style={{ marginBottom: "-12px" }}
                />
              </div>
              <div className="space-y-1">
                {requiredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-0.5"
                  >
                    <div className="flex items-center space-x-3">
                      {task.isCompleted ? (
                        <span className="text-green-300">[✓]</span>
                      ) : (
                        <span className="text-white">[ ]</span>
                      )}
                      <div>
                        <span className="text-blue-100 font-bold flex items-center text-xs sm:text-sm">
                          {getTaskIcon(task.id)}
                          {task.title}
                        </span>
                        <div className="text-[11px] text-blue-50 break-words max-w-full">
                          {task.description}
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto mt-1 sm:mt-0 flex justify-end">
                      {renderTaskButton(task)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="relative flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold mb-1 text-white border-b border-white/30 pb-1 tracking-widest">
                  BONUS TASKS
                </h2>
              </div>
              <div className="space-y-1">
                {optionalTasks.map((task) => (
                  <div
                    key={task.id}
                    className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-0.5"
                  >
                    <div className="flex items-center space-x-3">
                      {task.isCompleted ? (
                        <span className="text-green-300">[✓]</span>
                      ) : (
                        <span className="text-white">[ ]</span>
                      )}
                      <div>
                        <span className="text-blue-100 font-bold flex items-center text-xs sm:text-sm">
                          {getTaskIcon(task.id)}
                          {task.title}
                        </span>
                        <div className="text-[11px] text-blue-50 break-words max-w-full">
                          {task.description}
                        </div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto mt-1 sm:mt-0 flex justify-end">
                      {renderTaskButton(task)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full flex justify-end">{refreshButton}</div>
            <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 text-center mt-2 w-full">
              <pre className="text-white text-xs mb-2 select-none">
                [{"=".repeat(completedRequiredTasks)}
                {" ".repeat(
                  requiredTasks.length - completedRequiredTasks
                )}] {completedRequiredTasks}/{requiredTasks.length} Required [
                {"=".repeat(completedOptionalTasks)}
                {" ".repeat(
                  optionalTasks.length - completedOptionalTasks
                )}] {completedOptionalTasks}/{optionalTasks.length} Bonus
              </pre>
              <span className="bios-cursor" />
            </div>
            <div className="w-full flex flex-col items-center mt-1">
              <Button
                onClick={handleClaimAirdrop}
                disabled={!allRequiredCompleted || isClaiming}
                className="w-full bg-green-600 hover:bg-green-700 mt-2"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Claiming...
                  </>
                ) : (
                  "Claim Airdrop"
                )}
              </Button>
              {claimMessage && (
                <div
                  className={`mt-2 text-sm ${
                    claimMessage.includes("Error") ||
                    claimMessage.includes("Failed")
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {claimMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .terminal-border {
          border: 2px solid #fff;
          border-radius: 0;
          box-shadow: 0 0 0 2px #1752f0, 0 0 8px #fff2;
        }
        .scanline {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.04) 0px,
            rgba(255, 255, 255, 0.04) 1px,
            transparent 1px,
            transparent 4px
          );
        }
        .bios-cursor {
          display: inline-block;
          width: 8px;
          height: 1em;
          background: #fff;
          animation: blink 1s steps(1) infinite;
          vertical-align: bottom;
        }
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        @keyframes bob {
          0% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(8deg);
          }
          100% {
            transform: translateY(0) rotate(0deg);
          }
        }
        .animate-bob {
          animation: bob 2.8s ease-in-out infinite;
        }
        .neon-moon {
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 8px 2px #fff, 0 0 24px 4px #fff8, 0 0 40px 8px #fff4;
        }
      `}</style>
    </main>
  );
}
