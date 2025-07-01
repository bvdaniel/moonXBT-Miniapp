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
import { formatEther } from "viem";
import { useAccount, useReadContract, useDisconnect } from "wagmi";
import { UserContext } from "@farcaster/frame-core/dist/context";
import Image from "next/image";
import { FaTasks } from "react-icons/fa";
import LeaderboardTab from "@/app/leaderboard/LeaderboardTab";
import { useLogout, usePrivy, useWallets } from "@privy-io/react-auth";

// Hooks and services
import { useAirdropTasks, type Task } from "@/hooks/useAirdropTasks";
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
const MIN_A0X_REQUIRED = 10_000_000;

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

  const {
    tasks,
    requiredTasks,
    optionalTasks,
    completedRequiredTasks,
    completedOptionalTasks,
    initializeTasks,
    updateTask,
  } = useAirdropTasks(isInMiniApp ?? true);

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
    const farcasterTask = tasks.find((task) => task.id === "follow-farcaster");
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
      updateTask("follow-farcaster", {
        isCompleted: data.isFollowing === true,
        verificationError:
          data.isFollowing === true
            ? null
            : "You're not following this account yet.",
      });

      // Update Twitter task if data available
      if (data.twitterAccount && data.tasks?.["follow-twitter"]) {
        updateTask("follow-twitter", {
          isCompleted: data.tasks["follow-twitter"].completed === true,
          verificationError: data.tasks["follow-twitter"].completed
            ? null
            : "You're not following this account yet.",
        });
      }

      // Update social media tasks
      const socialTasks = [
        "follow-instagram",
        "follow-tiktok",
        "join-telegram",
        "follow-zora",
        "share-social",
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
            const points = taskId === "share-social" ? 50 : 100;
            setUserPoints((prev) => prev + points);
          }
        }
      });

      // Auto-verify Twitter if account is linked but not verified
      if (
        data.twitterAccount &&
        user?.fid &&
        (!data.tasks || data.tasks["follow-twitter"]?.completed !== true)
      ) {
        verifyTwitterFollow(user.fid, data.twitterAccount, data.walletAddress);
      }
    } catch (error) {
      console.error("Error verifying Farcaster follow:", error);
      updateTask("follow-farcaster", {
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
    const twitterTask = tasks.find((task) => task.id === "follow-twitter");
    if (!twitterTask?.targetUsername) return;

    try {
      const twitterData = await airdropApi.verifyTwitterFollow({
        fid,
        twitterUsername,
        targetTwitterUsername: twitterTask.targetUsername,
        walletAddress,
      });

      updateTask("follow-twitter", {
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
      updateTask("follow-twitter", {
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

      updateTask("hold-a0x", {
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

    if (task.id === "share-social") {
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

    if (task.id === "follow-farcaster") {
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

    if (task.id === "follow-twitter") {
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

  const handleClaimAirdrop = async () => {
    if (!allRequiredCompleted) {
      setClaimMessage("Please complete all required tasks first.");
      return;
    }
    setIsClaiming(true);
    setClaimMessage(null);

    // Placeholder for airdrop claim logic
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setClaimMessage(
      "Airdrop claim initiated! (This is a demo, no actual claim processed)"
    );
    setIsClaiming(false);
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
          <pre className="text-white text-[5px] md:text-[7px] leading-none mb-1 select-none text-center drop-shadow-[0_0_2px_white] font-mono tracking-widest overflow-x-auto whitespace-pre max-w-full">
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
            {/* Mini App Detection Info */}
            {isInMiniApp !== null && (
              <p className="text-blue-200 text-[10px] mt-1">
                {isInMiniApp ? "Running in Mini App" : "Running in Web Browser"}
              </p>
            )}
          </div>
          {isConnected && balance !== null && (
            <div className="w-full flex flex-col items-center my-3">
              <span className="text-blue-100 text-xs tracking-widest mb-1">
                Your $A0X Balance
              </span>
              <span className="text-white font-extrabold text-2xl sm:text-3xl bg-gradient-to-r from-blue-200 via-white to-blue-100 bg-clip-text text-transparent">
                {Number(balance).toLocaleString()} <span className="text-blue-200 text-lg">A0X</span>
              </span>
              <div className="w-1/2 h-px bg-blue-100/30 mt-2" />
            </div>
          )}

          <div className="flex justify-center">
            <div className="inline-flex overflow-hidden border-2 border-white">
              <button
                className={`px-6 py-2 font-bold text-sm tracking-widest select-none ${
                  activeTab === "tasks"
                    ? "bg-[#1752F0] text-white"
                    : "bg-[#1a2b6b] text-blue-200 hover:bg-[#223a8c]"
                } border-r-2 border-white`}
                style={{
                  fontFamily: "Press Start 2P, monospace",
                  letterSpacing: 2,
                  borderRadius: 0,
                }}
                onClick={() => setActiveTab("tasks")}
              >
                <FaTasks className="inline-block mr-2 align-middle" />
                TASKS
              </button>
              <button
                className={`px-6 py-2 font-bold text-sm tracking-widest select-none ${
                  activeTab === "leaderboard"
                    ? "bg-[#1752F0] text-white"
                    : "bg-[#1a2b6b] text-blue-200 hover:bg-[#223a8c]"
                }`}
                style={{
                  fontFamily: "Press Start 2P, monospace",
                  letterSpacing: 2,
                  borderRadius: 0,
                }}
                onClick={() => setActiveTab("leaderboard")}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block mr-2 align-middle"
                >
                  <rect x="3" y="3" width="18" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
                LEADERBOARD
              </button>
            </div>
          </div>

          <div className="min-h-[600px] flex flex-col justify-start">
            {activeTab === "tasks" ? (
              <div className="space-y-8">
                {/* Wallet Connection Section */}
                {!isInMiniApp && (
                  <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 text-center w-full">
                    {!ready ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Loader2 className="w-5 h-5 text-blue-200 animate-spin" />
                        <span className="text-blue-200 text-sm">
                          Loading...
                        </span>
                      </div>
                    ) : !authenticated ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <Wallet className="w-5 h-5 text-blue-200" />
                          <span className="text-blue-200 text-sm font-bold tracking-wide">
                            WALLET CONNECTION
                          </span>
                        </div>
                        <p className="text-blue-100 text-xs mb-3">
                          Connect your wallet to participate in the airdrop
                        </p>
                        <Button
                          onClick={handleLogin}
                          disabled={disableLogin}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 w-full rounded-none tracking-wider"
                        >
                          <Wallet className="w-4 h-4 mr-2" />
                          CONNECT WALLET
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                          <span className="text-green-400 text-sm font-bold tracking-wide">
                            WALLET CONNECTED
                          </span>
                        </div>
                        <div className="flex items-center justify-around w-full">
                          {wallets[0]?.address && (
                            <p className="text-blue-100 text-sm">
                              {wallets[0].address.slice(0, 6)}...
                              {wallets[0].address.slice(-4)}
                            </p>
                          )}
                          <div className="flex space-x-2">
                            <Button
                              onClick={handleSignout}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1 text-xs rounded-none"
                            >
                              DISCONNECT
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                            <span className="text-green-300 flex-1 min-w-max">
                              [✓]
                            </span>
                          ) : (
                            <span className="text-white flex-1 min-w-max">
                              [ ]
                            </span>
                          )}
                          <div>
                            <div className="text-blue-100 font-bold flex items-center text-xs sm:text-sm justify-start gap-2 w-full">
                              {getTaskIcon(task.id)}
                              <span className="w-fit">{task.title}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-3 h-3 ml-1 text-blue-300 cursor-help hover:text-blue-200" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 border border-gray-700">
                                    <p className="text-white text-xs">
                                      {task.pointsDescription ||
                                        `${task.points} points for completing this task`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
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
                        className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-0.5 gap-2"
                      >
                        <div className="flex items-center space-x-3">
                          {task.isCompleted ? (
                            <span className="text-green-300 flex-1 min-w-max">
                              [✓]
                            </span>
                          ) : (
                            <span className="text-white flex-1 min-w-max">
                              [ ]
                            </span>
                          )}
                          <div>
                            <div className="text-blue-100 font-bold flex items-center text-xs sm:text-sm justify-start gap-2 w-full">
                              {getTaskIcon(task.id)}
                              <span className="w-fit">{task.title}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="w-3 h-3 ml-1 text-blue-300 cursor-help hover:text-blue-200" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 border border-gray-700">
                                    <p className="text-white text-xs">
                                      {task.pointsDescription ||
                                        `${task.points} points for completing this task`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
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
                <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 text-center mt-2 w-full">
                  <pre className="text-white text-xs mb-2 select-none">
                    [{"=".repeat(completedRequiredTasks)}
                    {" ".repeat(
                      requiredTasks.length - completedRequiredTasks
                    )}] {completedRequiredTasks}/{requiredTasks.length} Required
                    [{"=".repeat(completedOptionalTasks)}
                    {" ".repeat(
                      optionalTasks.length - completedOptionalTasks
                    )}] {completedOptionalTasks}/{optionalTasks.length} Bonus
                  </pre>
                  <span className="bios-cursor" />
                </div>
                <div className="w-full flex flex-col items-center mt-1">
                  <Button
                    onClick={handleClaimAirdrop}
                    disabled={true}
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
            ) : (
              <LeaderboardTab isInMiniApp={isInMiniApp || false} />
            )}
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
