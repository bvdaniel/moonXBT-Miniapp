"use client";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import sdk from "@farcaster/frame-sdk";
import { Loader2, Info, CheckCircle2, Wallet } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, useReadContract, useDisconnect } from "wagmi";
import { UserContext } from "@farcaster/frame-core/dist/context";
import Image from "next/image";
import { FaTasks } from "react-icons/fa";
import LeaderboardTab from "@/app/leaderboard/LeaderboardTab";
import ClaimSection from "@/components/ClaimSection";
import TaskList from "@/components/TaskList";
import ProgressPanel from "@/components/ProgressPanel";
import BackgroundLayer from "@/components/BackgroundLayer";
import HeaderSection from "@/components/HeaderSection";
import BalanceCard from "@/components/BalanceCard";
import Tabs from "@/components/Tabs";
import WalletSection from "@/components/WalletSection";
import { useLogout, usePrivy, useWallets } from "@privy-io/react-auth";

// Hooks and services
import { useAirdropTasks, type Task } from "@/hooks/useAirdropTasks";
import {
  getRequiredTaskIdsForEnv,
  MIN_A0X_REQUIRED,
  TaskId,
} from "@/constants/tasks";
import { computeMissingRequired } from "@/lib/airdrop";
import { airdropApi, type UserInfo } from "@/services/airdropApi";

// Components
import A0XTaskButton from "@/components/task-components/A0XTaskButton";
import ShareMiniappButton from "@/components/task-components/ShareMiniappButton";
import TwitterTaskButton from "@/components/task-components/TwitterTaskButton";
import FarcasterTaskButton from "@/components/task-components/FarcasterTaskButton";
import SocialTaskButton from "@/components/task-components/SocialTaskButton";

// Constants
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
// MIN_A0X_REQUIRED imported from constants

const calculateA0XPoints = (balance: number): number => {
  if (balance < MIN_A0X_REQUIRED) return 0;
  const basePoints = 100;
  const extraMillions = Math.floor((balance - MIN_A0X_REQUIRED) / 1000000);
  return basePoints + extraMillions;
};

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

interface AirdropClientProps {
  sharedFid?: number | null;
}

export default function AirdropClient({ sharedFid }: AirdropClientProps) {
  // Privy hooks
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { logout } = useLogout({
    onSuccess: () => {
      console.log("User logged out");
    },
  });

  // Wagmi hooks for balance reading
  const { address, isConnected } = useAccount();

  // State
  const [balance, setBalance] = useState<string | null>(null);
  const [user, setUser] = useState<UserContext | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [asciiLinesToShow, setAsciiLinesToShow] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "leaderboard">("tasks");
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [missingTasks, setMissingTasks] = useState<string[]>([]);
  const [isPreflighting, setIsPreflighting] = useState(false);

  // --- Helpers (Step A): use shared utilities for preflight ---

  // defer reconcile definition until updateTask is defined below
  let reconcileTasksFromSnapshot = (
    localTasks: Task[],
    snapshotTasks:
      | Record<string, { completed?: boolean } | undefined>
      | undefined
  ) => {};

  const {
    tasks,
    requiredTasks,
    optionalTasks,
    completedRequiredTasks,
    completedOptionalTasks,
    initializeTasks,
    updateTask,
  } = useAirdropTasks(isInMiniApp ?? true);

  // now bind reconcile with the captured updateTask
  reconcileTasksFromSnapshot = (
    localTasks: Task[],
    snapshotTasks:
      | Record<string, { completed?: boolean } | undefined>
      | undefined
  ) => {
    localTasks.forEach((t) => {
      if (t.id === TaskId.HoldA0X) return;
      const backendCompleted = snapshotTasks?.[t.id]?.completed === true;
      if (backendCompleted !== t.isCompleted) {
        updateTask(t.id, {
          isCompleted: backendCompleted,
          verificationError: null,
        });
      }
    });
  };

  const lastBalanceRef = useRef<string | null>(null);
  const lastPointsRef = useRef<number | null>(null);
  const addressRef = useRef<string | null>(null);

  // Privy computed values
  const disableLogin = !ready || (ready && authenticated);

  const addressLowerCase = useMemo(() => {
    if (wallets[0] && wallets[0].address) {
      addressRef.current = wallets[0].address;
      return wallets[0].address.toLowerCase();
    }
    if (address) {
      addressRef.current = address;
      return address.toLowerCase();
    }
    return "";
  }, [wallets, address]);

  // initialize user if not in miniapp and ready and authenticated and wallets.length > 0
  useEffect(() => {
    const initializeUserWithoutMiniApp = async () => {
      const wallet = wallets[0];
      if (wallet) {
        try {
          await airdropApi.initializeParticipant({
            fid: -1, // Use -1 to indicate web user (not Farcaster miniapp)
            username: `web-user-${wallet.address.slice(0, 8)}`, // Unique username for web users
            displayName: `Web User ${wallet.address.slice(0, 6)}...`,
            pfpUrl:
              "https://api.dicebear.com/7.x/identicon/svg?seed=" +
              wallet.address, // Generate identicon
            isFollowingFarcaster: false,
            walletAddress: wallet.address,
            referredByFid: sharedFid || null,
          });
          console.log("Web user initialized successfully");
        } catch (error) {
          console.error("Error initializing web user:", error);
        }
      }
    };
    if (!isInMiniApp && ready && authenticated && wallets.length > 0) {
      initializeUserWithoutMiniApp();
    }
  }, [ready, authenticated, wallets, isInMiniApp, sharedFid]);

  const { data: tokenBalanceData, isLoading: isLoadingTokenBalance } =
    useReadContract({
      chainId: 8453,
      address: A0X_TOKEN_ADDRESS,
      abi: tokenABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
      query: {
        enabled: !!address && isConnected,
        refetchInterval: false,
      },
    });

  // Privy handlers
  const handleSignout = useCallback(async () => {
    try {
      await logout();
      await wagmiDisconnect();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }, [logout, wagmiDisconnect]);

  const handleCopy = useCallback(async () => {
    if (!wallets[0]?.address) return;
    try {
      await navigator.clipboard.writeText(wallets[0].address);
      console.log("Wallet address copied to clipboard");
      setCopied(true);
    } catch (error) {
      console.error("Error copying wallet address", error);
    } finally {
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  }, [wallets]);

  const handleLogin = useCallback(() => {
    login({
      loginMethods: ["wallet", "telegram", "twitter", "farcaster"],
    });
  }, [login]);

  // Initialize and detect miniapp
  useEffect(() => {
    setIsClient(true);
    sdk.actions.ready();

    // Detect if running in miniapp
    const detectMiniApp = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log("Is in Mini App:", isMiniApp);
      } catch (error) {
        console.error("Error detecting Mini App:", error);
        setIsInMiniApp(false);
      }
    };

    detectMiniApp();
  }, []);

  // Re-initialize tasks when miniapp status changes
  useEffect(() => {
    if (isInMiniApp !== null) {
      initializeTasks();
    }
  }, [isInMiniApp, initializeTasks]);

  // Handle wallet timeout
  useEffect(() => {
    if (ready && authenticated) {
      const timer = setTimeout(() => {
        if (wallets.length === 0) {
          console.log("ready and authenticated but no wallets after 8 seconds");
          handleSignout();
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [ready, authenticated, wallets, handleSignout]);

  // ASCII animation
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

  // Get user context
  useEffect(() => {
    const viewProfile = async () => {
      const context = await sdk.context;
      const user = context?.user;
      if (user) {
        setUser(user);
        if (user.fid) {
          // Use the complete verification function
          verifyFarcasterFollow(user.fid);
        }
      }
    };
    if (isInMiniApp) {
      viewProfile();
    }
  }, [sharedFid, ready, authenticated, isInMiniApp]);

  // Complete function to verify Farcaster follow and handle all related tasks
  const verifyFarcasterFollow = async (
    fid: number,
    isRefresh: boolean = false
  ) => {
    const farcasterTask = tasks.find(
      (task) => task.id === TaskId.FollowFarcaster
    );
    if (!farcasterTask || !farcasterTask.targetUsername) return;

    try {
      const data = await airdropApi.verifyFarcasterFollow(
        fid,
        farcasterTask.targetUsername,
        isRefresh
      );

      setUserInfo(data);
      setUserPoints(data.points || 0);

      // Initialize participant if we have the data
      if (data.fid && data.username) {
        console.log("Initializing participant", data, user);
        try {
          await airdropApi.initializeParticipant({
            fid: data.fid,
            username: data.username,
            displayName: data.displayName,
            pfpUrl: data.profilePicture || user?.pfpUrl || "",
            isFollowingFarcaster: data.isFollowing,
            walletAddress: data.walletAddress,
            referredByFid: sharedFid || null,
          });
        } catch (initError) {
          console.error("Error initializing participant:", initError);
        }
      }

      // Update Farcaster task
      updateTask(TaskId.FollowFarcaster, {
        isCompleted: data.isFollowing === true,
        verificationError:
          data.isFollowing === true
            ? null
            : "You're not following this account yet.",
      });

      // Update Twitter task if data available
      if (data.twitterAccount && data.tasks?.[TaskId.FollowTwitter]) {
        updateTask(TaskId.FollowTwitter, {
          isCompleted: data.tasks[TaskId.FollowTwitter].completed === true,
          verificationError: data.tasks[TaskId.FollowTwitter].completed
            ? null
            : "You're not following this account yet.",
        });
      }

      // Update social media tasks
      const socialTasks = [
        TaskId.FollowInstagram,
        TaskId.FollowTikTok,
        TaskId.JoinTelegram,
        TaskId.FollowZora,
        TaskId.ShareSocial,
      ];

      socialTasks.forEach((taskId) => {
        if (data.tasks?.[taskId]) {
          updateTask(taskId, {
            isCompleted: data.tasks[taskId].completed === true,
            verificationError: data.tasks[taskId].completed
              ? null
              : "Task not completed yet.",
          });

          // Add points for completed tasks
          if (
            data.tasks[taskId].completed &&
            !tasks.find((t) => t.id === taskId)?.isCompleted
          ) {
            const points = taskId === TaskId.ShareSocial ? 50 : 100;
            setUserPoints((prev) => prev + points);
          }
        }
      });

      // Auto-verify Twitter if account is linked but not verified
      if (
        data.twitterAccount &&
        user?.fid &&
        (!data.tasks || data.tasks[TaskId.FollowTwitter]?.completed !== true)
      ) {
        verifyTwitterFollow(user.fid, data.twitterAccount, data.walletAddress);
      }
    } catch (error) {
      console.error("Error verifying Farcaster follow:", error);
      updateTask(TaskId.FollowFarcaster, {
        verificationError: "Network error verifying follow status.",
      });
    }
  };

  // Function to verify Twitter follow
  const verifyTwitterFollow = async (
    fid: number | string | null,
    twitterUsername: string,
    walletAddress: string
  ) => {
    const twitterTask = tasks.find((task) => task.id === TaskId.FollowTwitter);
    if (!twitterTask?.targetUsername) return;

    try {
      const twitterData = await airdropApi.verifyTwitterFollow({
        fid,
        twitterUsername,
        targetTwitterUsername: twitterTask.targetUsername,
        walletAddress,
      });

      updateTask(TaskId.FollowTwitter, {
        isCompleted: twitterData.dataReceived.isFollowing === true,
        verificationError:
          twitterData.dataReceived.isFollowing === true
            ? null
            : "You're not following this account yet.",
      });

      // Add points if newly completed
      if (
        twitterData.dataReceived.isFollowing === true &&
        !twitterTask.isCompleted
      ) {
        setUserPoints((prev) => prev + 100);
      }
    } catch (error) {
      console.error("Error verifying Twitter follow:", error);
      updateTask(TaskId.FollowTwitter, {
        verificationError: "Error verifying Twitter follow status.",
      });
    }
  };

  // Function to refresh verification
  const handleRefreshVerification = useCallback(async () => {
    if (user?.fid) {
      await verifyFarcasterFollow(user.fid, true);
    }
  }, [user?.fid, tasks]);

  // Update balance and A0X task
  useEffect(() => {
    if (tokenBalanceData !== undefined) {
      const balanceInWei = BigInt(tokenBalanceData);
      const balanceInEther = Number(formatEther(balanceInWei));
      const balanceStr = balanceInEther.toString();

      setBalance(balanceStr);
      lastBalanceRef.current = balanceStr;

      const points = calculateA0XPoints(balanceInEther);
      lastPointsRef.current = points;

      updateTask(TaskId.HoldA0X, {
        isCompleted: balanceInEther >= MIN_A0X_REQUIRED,
        verificationError: null,
        points,
        pointsDescription: `Current points: ${points} (${balanceInEther.toLocaleString()} A0X)`,
      });
    }
  }, [tokenBalanceData, updateTask]);

  const renderTaskButton = (task: Task) => {
    if (task.socialNetwork === "a0x") {
      return (
        <A0XTaskButton
          task={task}
          balance={balance}
          isLoadingTokenBalance={isLoadingTokenBalance}
          isConnected={isConnected || wallets.length > 0}
          userFid={user?.fid}
          address={address}
          isInMiniApp={isInMiniApp}
        />
      );
    }

    if (task.id === TaskId.ShareSocial) {
      // In miniapp: use ShareMiniappButton for Farcaster sharing
      if (isInMiniApp) {
        return (
          <ShareMiniappButton
            task={task}
            user={user}
            userPoints={userPoints}
            lastPointsRef={lastPointsRef}
            onTaskUpdate={updateTask}
          />
        );
      } else {
        // In web browser: simple share button for X/Twitter
        return (
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  if (task.url) {
                    window.open(task.url, "_blank");
                    // Mark as completed when clicked
                    updateTask(task.id, { isCompleted: true });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-sm p-0 px-1 h-6 text-white rounded-none"
              >
                Share
              </Button>
              {task.isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
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
    }

    if (task.id === TaskId.FollowFarcaster) {
      // Always use FarcasterTaskButton, but with different behavior for web vs miniapp
      return (
        <FarcasterTaskButton
          task={task}
          user={user}
          isVerifyingFarcaster={false}
          isRefreshing={false}
          onTaskUpdate={updateTask}
          onVerifyFollow={async (username) => {
            if (isInMiniApp) {
              await handleRefreshVerification();
            } else {
              // For web users: verify by username
              try {
                const data = await airdropApi.verifyFarcasterFollowByUsername(
                  username,
                  task.targetUsername || "",
                  addressLowerCase || undefined
                );

                updateTask(task.id, {
                  isCompleted: data.isFollowing === true,
                  verificationError:
                    data.isFollowing === true
                      ? null
                      : "You're not following this account yet.",
                });

                if (data.isFollowing === true) {
                  setUserPoints((prev) => prev + 100);
                }
              } catch (error) {
                console.error(
                  "Error verifying Farcaster follow by username:",
                  error
                );
                updateTask(task.id, {
                  verificationError:
                    error instanceof Error
                      ? error.message
                      : "Error verifying follow status.",
                });
              }
            }
          }}
        />
      );
    }

    if (task.id === TaskId.FollowTwitter) {
      // In web browser: simple external link (can't verify without real FID)
      if (!isInMiniApp) {
        return (
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  if (task.url) {
                    window.open(task.url, "_blank");
                    // For web users, we trust they completed it
                    updateTask(task.id, { isCompleted: true });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-sm p-0 px-1 h-6 text-white rounded-none"
              >
                Follow
              </Button>
              {task.isCompleted && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </div>
            {task.verificationError && (
              <span className="text-xs text-red-400">
                {task.verificationError}
              </span>
            )}
          </div>
        );
      } else {
        // In miniapp: use full verification
        return (
          <TwitterTaskButton
            task={task}
            user={user}
            userInfo={userInfo}
            isVerifyingTwitter={false}
            isVerifyingFarcaster={false}
            isVerifyingAll={false}
            isRefreshing={false}
            onTaskUpdate={updateTask}
            onTwitterSubmit={async () => {
              if (task.targetUsername && userInfo?.walletAddress) {
                await verifyTwitterFollow(
                  user?.fid || addressLowerCase || "",
                  userInfo.twitterAccount || "",
                  userInfo.walletAddress
                );
              }
            }}
            onRefresh={handleRefreshVerification}
            isInMiniApp={isInMiniApp}
          />
        );
      }
    }

    if (
      task.id === "follow-tiktok" ||
      task.id === "follow-instagram" ||
      task.id === "join-telegram" ||
      task.id === "follow-zora"
    ) {
      return (
        <SocialTaskButton
          task={task}
          user={user}
          userInfo={userInfo}
          onTaskUpdate={updateTask}
          onUsernameSubmit={async (platform, username) => {
            switch (platform) {
              case "instagram":
                const instagramResponse = await airdropApi.registerSocialTask(
                  "instagram",
                  {
                    farcasterFid: user?.fid || null,
                    username: username,
                    targetUsername: task.targetUsername || "",
                    walletAddress: addressLowerCase || "",
                  }
                );
                if (instagramResponse.dataReceived.success === true) {
                  setUserInfo((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tasks: {
                        ...prev.tasks,
                        [task.id]: {
                          ...prev.tasks[task.id],
                          verificationDetails: {
                            ...prev.tasks[task.id].verificationDetails,
                            checkedUsername: username,
                          },
                        },
                      },
                    };
                  });
                }
              case "tiktok":
                const tiktokResponse = await airdropApi.registerSocialTask(
                  "tiktok",
                  {
                    farcasterFid: user?.fid || null,
                    username: username,
                    targetUsername: task.targetUsername || "",
                    walletAddress: addressLowerCase || "",
                  }
                );
                if (tiktokResponse.dataReceived.success === true) {
                  setUserInfo((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tasks: {
                        ...prev.tasks,
                        [task.id]: {
                          ...prev.tasks[task.id],
                          verificationDetails: {
                            ...prev.tasks[task.id].verificationDetails,
                            checkedUsername: username,
                          },
                        },
                      },
                    };
                  });
                }
              case "telegram":
                const telegramResponse = await airdropApi.registerSocialTask(
                  "telegram",
                  {
                    farcasterFid: user?.fid || null,
                    username: username,
                    targetUsername: task.targetUsername || "",
                    walletAddress: addressLowerCase || "",
                  }
                );

                if (telegramResponse.dataReceived.success === true) {
                  setUserInfo((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tasks: {
                        ...prev.tasks,
                        [task.id]: {
                          ...prev.tasks[task.id],
                          telegramUsername: username,
                        },
                      },
                    };
                  });
                }

              case "zora":
                const zoraResponse = await airdropApi.registerSocialTask(
                  "zora",
                  {
                    farcasterFid: user?.fid || null,
                    username: username,
                    targetUsername: task.targetUsername || "",
                    walletAddress: addressLowerCase || "",
                  }
                );

                if (zoraResponse.dataReceived.success === true) {
                  setUserInfo((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tasks: {
                        ...prev.tasks,
                        [task.id]: {
                          ...prev.tasks[task.id],
                          verificationDetails: {
                            ...prev.tasks[task.id].verificationDetails,
                            checkedUsername: username,
                          },
                        },
                      },
                    };
                  });
                }

              case "farcaster":
                const farcasterResponse = await airdropApi.registerSocialTask(
                  "farcaster",
                  {
                    farcasterFid: null,
                    username: username,
                    targetUsername: task.targetUsername || "",
                    walletAddress: addressLowerCase || "",
                  }
                );
                if (farcasterResponse.dataReceived.success === true) {
                  setUserInfo((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tasks: {
                        ...prev.tasks,
                        [task.id]: {
                          ...prev.tasks[task.id],
                          verificationDetails: {
                            ...prev.tasks[task.id].verificationDetails,
                            checkedUsername: username,
                          },
                        },
                      },
                    };
                  });
                }

              default:
                return Promise.resolve();
            }
          }}
          isInMiniApp={isInMiniApp}
        />
      );
    }

    // Fallback button
    return (
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => task.url && sdk.actions.openUrl(task.url)}
            className="bg-gray-600 hover:bg-gray-700 text-sm p-0 px-1 h-6 text-white rounded-none"
          >
            Open
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

  const getTaskIcon = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    return task?.icon || null;
  };

  const allRequiredCompleted =
    isClient && isConnected && completedRequiredTasks === requiredTasks.length;

  const getRequiredTaskIds = useCallback(
    (): string[] => getRequiredTaskIdsForEnv(isInMiniApp),
    [isInMiniApp]
  );

  // --- Step B: Query wrapper for participant snapshot (manual refetch in preflight) ---
  const { refetch: refetchSnapshot } = useQuery({
    queryKey: ["participant-snapshot", user?.fid ?? "none"],
    enabled: false, // only on-demand during preflight
    queryFn: async () => {
      if (!user?.fid) throw new Error("No fid to fetch snapshot");
      return airdropApi.getParticipantSnapshot({ fid: user.fid });
    },
    staleTime: 15_000,
    gcTime: 60_000,
  });

  const handleClaimAirdrop = async (...args: any[]): Promise<void> => {
    const refreshOnly: boolean | undefined = args[0];
    setClaimMessage(null);
    setMissingTasks([]);
    setIsPreflighting(true);
    try {
      // Pre-checks: ensure wallet/auth context is present for the flow
      const hasWallet = Boolean(wallets[0]?.address || address);
      if (!hasWallet) {
        setClaimMessage("Please connect your wallet to continue.");
        return;
      }
      if (isInMiniApp && !user?.fid) {
        setClaimMessage("Please authenticate with Farcaster in the mini app.");
        return;
      }

      if (isInMiniApp && user?.fid) {
        await verifyFarcasterFollow(user.fid, true);
      }

      let snapshot: any;
      if (user?.fid) {
        const result = await refetchSnapshot();
        snapshot = result.data;
      } else {
        const fidToUse: number | string = -1; // legacy web path
        snapshot = await airdropApi.getParticipantSnapshot({ fid: fidToUse });
      }

      // Reconcile local optimistic tasks (except hold-a0x which is governed by on-chain balance)
      reconcileTasksFromSnapshot(tasks, snapshot.tasks);

      const requiredIds = getRequiredTaskIds();
      const missing = computeMissingRequired(
        requiredIds,
        snapshot.tasks,
        balance,
        MIN_A0X_REQUIRED
      );

      if (missing.length > 0) {
        setMissingTasks(missing);
        setClaimMessage("Please complete the required tasks below.");
        return;
      }

      if (refreshOnly) {
        setClaimMessage("All required tasks are complete.");
        return;
      }

      setIsClaiming(true);
      // Placeholder for airdrop claim logic
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setClaimMessage(
        "Airdrop claim initiated! (This is a demo, no actual claim processed)"
      );
      setIsClaiming(false);
    } catch (error) {
      console.error("Error during claim preflight:", error);
      setClaimMessage("Error preparing claim. Please try again.");
    } finally {
      setIsPreflighting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1752F0] text-white font-mono relative overflow-hidden">
      <BackgroundLayer />
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-2 sm:px-4 py-4">
        <HeaderSection
          title="AIRDROP"
          subtitle="Complete tasks to earn your airdrop!"
          isInMiniApp={isInMiniApp}
          asciiLogoLines={asciiLogoLines}
          asciiLinesToShow={asciiLinesToShow}
        />
        <div className="w-full max-w-xs sm:max-w-sm space-y-4">
          <BalanceCard isConnected={isConnected} balance={balance} />
          <Tabs active={activeTab} onChange={setActiveTab} />
          {!isInMiniApp && (
            <WalletSection
              shown={!isInMiniApp}
              ready={ready}
              authenticated={authenticated}
              wallets={wallets}
              disableLogin={disableLogin}
              onLogin={handleLogin}
              onSignout={handleSignout}
            />
          )}

          <TaskList
            title="REQUIRED TASKS"
            tasks={requiredTasks}
            renderTaskButton={renderTaskButton}
          />
          <TaskList
            title="BONUS TASKS"
            tasks={optionalTasks}
            renderTaskButton={renderTaskButton}
          />
          <ProgressPanel
            completedRequiredTasks={completedRequiredTasks}
            requiredTotal={requiredTasks.length}
            completedOptionalTasks={completedOptionalTasks}
            optionalTotal={optionalTasks.length}
          />
          <ClaimSection
            isClaiming={isClaiming}
            isPreflighting={isPreflighting}
            claimMessage={claimMessage}
            missingTasks={missingTasks}
            tasks={tasks}
            onClaim={handleClaimAirdrop}
            onRefresh={() => void handleClaimAirdrop(true)}
          />
        </div>
      </div>
    </main>
  );
}
