"use client";
import sdk from "@farcaster/frame-sdk";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { useAccount, useReadContract, useDisconnect } from "wagmi";
import { UserContext } from "@farcaster/frame-core/dist/context";
import ClaimSection from "@/components/ClaimSection";
import TaskList from "@/components/TaskList";
import ProgressPanel from "@/components/ProgressPanel";
import BackgroundLayer from "@/components/BackgroundLayer";
import HeaderSection from "@/components/HeaderSection";
import BalanceCard from "@/components/BalanceCard";
import Tabs from "@/components/Tabs";
import LeaderboardTab from "@/app/leaderboard/LeaderboardTab";
import WalletSection from "@/components/WalletSection";
import { useInitializeParticipant } from "@/hooks/useInitializeParticipant";
import { useTwitterVerification } from "@/hooks/useTwitterVerification";
import { useLogout, usePrivy, useWallets } from "@privy-io/react-auth";
import { useMiniAppDetection } from "@/hooks/useMiniAppDetection";
import { useAsciiLogoAnimation } from "@/hooks/useAsciiLogoAnimation";

// Hooks and services
import { useAirdropTasks, type Task } from "@/hooks/useAirdropTasks";
import {
  getRequiredTaskIdsForEnv,
  MIN_A0X_REQUIRED,
  TaskId,
} from "@/constants/tasks";
import { computeMissingRequired } from "@/lib/airdrop";
import {
  airdropApi,
  type UserInfo,
  type ParticipantSnapshot,
} from "@/services/airdropApi";

// Components
import TaskButtonRouter from "@/components/task-components/TaskButtonRouter";

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
  const [activeTab, setActiveTab] = useState<"tasks" | "leaderboard">("tasks");
  const [userPoints, setUserPoints] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [missingTasks, setMissingTasks] = useState<string[]>([]);
  const [isPreflighting, setIsPreflighting] = useState(false);
  const handleDismissMessage = useCallback(() => setClaimMessage(null), []);

  // will initialize tasks after miniapp detection is available

  // reconcile with the captured updateTask
  const reconcileTasksFromSnapshot = (
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Privy computed values
  const disableLogin = !ready || (ready && authenticated);

  useEffect(() => {
    // Keep a ref and state with the latest known address from either Privy or Wagmi
    const latest = wallets[0]?.address || address || null;
    if (latest && latest !== addressRef.current) {
      addressRef.current = latest;
      setWalletAddress(latest);
    }
  }, [wallets, address]);

  // Fallback: after a refresh, poll briefly until an address appears
  useEffect(() => {
    if (walletAddress) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      const latest = wallets[0]?.address || address || null;
      if (latest) {
        addressRef.current = latest;
        setWalletAddress(latest);
        clearInterval(id);
      }
      if (attempts > 12) clearInterval(id); // ~6s max
    }, 500);
    return () => clearInterval(id);
  }, [walletAddress, wallets, address]);

  const addressLowerCase = (walletAddress || "").toLowerCase();

  const effectiveAddress = walletAddress;

  const hasWalletAvailable = Boolean(walletAddress);

  // initialize user if not in miniapp and ready and authenticated and wallets.length > 0
  useInitializeParticipant({
    isInMiniApp: useMiniAppDetection(),
    ready,
    authenticated,
    wallets,
    sharedFid,
  });

  const { data: tokenBalanceData, isLoading: isLoadingTokenBalance } =
    useReadContract({
      chainId: 8453,
      address: A0X_TOKEN_ADDRESS,
      abi: tokenABI,
      functionName: "balanceOf",
      args: [effectiveAddress as `0x${string}`],
      query: {
        enabled: Boolean(effectiveAddress),
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

  const handleLogin = useCallback(() => {
    login({
      loginMethods: ["wallet", "telegram", "twitter", "farcaster"],
    });
  }, [login]);

  // Initialize and detect miniapp
  useEffect(() => {
    sdk.actions.ready();
  }, []);
  const isInMiniApp = useMiniAppDetection();

  const {
    tasks,
    requiredTasks,
    optionalTasks,
    completedRequiredTasks,
    completedOptionalTasks,
    initializeTasks,
    updateTask,
  } = useAirdropTasks(isInMiniApp ?? true);

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
  const asciiLinesToShow = useAsciiLogoAnimation(asciiLogoLines);

  // (moved) Get user context effect below, after verifyFarcasterFollow is defined

  const { verifyTwitterFollow } = useTwitterVerification(updateTask);

  // Complete function to verify Farcaster follow and handle all related tasks
  const verifyFarcasterFollow = useCallback(
    async (fid: number, isRefresh: boolean = false) => {
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
              username: data.username || "",
              displayName: data.displayName || user?.username || "",
              pfpUrl: data.profilePicture || user?.pfpUrl || "",
              isFollowingFarcaster: Boolean(data.isFollowing),
              walletAddress: data.walletAddress || effectiveAddress || "",
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

        // Map API task keys to internal task IDs
        const apiTaskMapping: Record<string, string> = {
          "post-twitter": TaskId.ShareSocial,
        };

        socialTasks.forEach((taskId) => {
          // Check both the direct task ID and any mapped API keys
          const apiKey =
            Object.keys(apiTaskMapping).find(
              (key) => apiTaskMapping[key] === taskId
            ) || taskId;
          const taskData = data.tasks?.[apiKey] || data.tasks?.[taskId];

          if (taskData) {
            updateTask(taskId, {
              isCompleted: taskData.completed === true,
              verificationError: taskData.completed
                ? null
                : "Task not completed yet.",
            });

            // Add points for completed tasks
            if (
              taskData.completed &&
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
          const twitterTask = tasks.find((t) => t.id === TaskId.FollowTwitter);
          if (twitterTask?.targetUsername) {
            await verifyTwitterFollow(
              user.fid,
              data.twitterAccount || "",
              twitterTask.targetUsername,
              data.walletAddress || "",
              Boolean(twitterTask.isCompleted),
              () => setUserPoints((prev) => prev + 100)
            );
          }
        }
      } catch (error) {
        console.error("Error verifying Farcaster follow:", error);
        updateTask(TaskId.FollowFarcaster, {
          verificationError: "Network error verifying follow status.",
        });
      }
    },
    [
      tasks,
      updateTask,
      setUserInfo,
      setUserPoints,
      verifyTwitterFollow,
      sharedFid,
      user,
      effectiveAddress,
    ]
  );

  // Fetch Farcaster context once in mini app
  const fetchedContextRef = useRef(false);
  useEffect(() => {
    if (!isInMiniApp || fetchedContextRef.current) return;
    fetchedContextRef.current = true;
    (async () => {
      const context = await sdk.context;
      const u = context?.user ?? null;
      setUser(u);
    })();
  }, [isInMiniApp]);

  // Trigger verification once per fid in mini app
  const verifiedFidRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isInMiniApp) return;
    if (!user?.fid) return;
    if (verifiedFidRef.current === user.fid) return;
    verifiedFidRef.current = user.fid;
    void verifyFarcasterFollow(user.fid);
  }, [isInMiniApp, user?.fid, verifyFarcasterFollow]);

  // Function to refresh verification
  const refreshingRef = useRef(false);
  const handleRefreshVerification = useCallback(async () => {
    if (!user?.fid) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await verifyFarcasterFollow(user.fid, true);
    } finally {
      refreshingRef.current = false;
    }
  }, [user?.fid, verifyFarcasterFollow]);

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

  const renderTaskButton = useCallback(
    (task: Task) => (
      <TaskButtonRouter
        task={task}
        isInMiniApp={isInMiniApp}
        user={user}
        userInfo={userInfo}
        addressLowerCase={addressLowerCase}
        balance={balance}
        isLoadingTokenBalance={isLoadingTokenBalance}
        hasAnyWallet={isConnected || wallets.length > 0}
        userFid={user?.fid}
        address={address}
        updateTask={updateTask}
        verifyTwitterFollow={verifyTwitterFollow}
        handleRefreshVerification={handleRefreshVerification}
        setUserInfo={setUserInfo}
      />
    ),
    [
      isInMiniApp,
      user,
      userInfo,
      addressLowerCase,
      balance,
      isLoadingTokenBalance,
      isConnected,
      wallets.length,
      address,
      lastPointsRef,
      userPoints,
      updateTask,
      verifyTwitterFollow,
      handleRefreshVerification,
      setUserInfo,
    ]
  );

  // Web auto-verification by wallet (if we have an address but no fid)
  const walletVerifyOnceRef = useRef<string | null>(null);
  useEffect(() => {
    // if (isInMiniApp) return;
    // if (user?.fid) return;
    const farcasterTask = tasks.find((t) => t.id === TaskId.FollowFarcaster);
    if (!farcasterTask?.targetUsername) return;
    if (!effectiveAddress) return;
    if (walletVerifyOnceRef.current === effectiveAddress) return;
    walletVerifyOnceRef.current = effectiveAddress;
    (async () => {
      try {
        const data = await airdropApi.verifyFarcasterFollowByWalletAddress(
          effectiveAddress
        );
        setUserInfo((prev) => ({ ...(prev || {}), ...data } as UserInfo));

        console.log("[Wallet auto-verification] data", data);

        if (!isInMiniApp) {
          updateTask(TaskId.FollowFarcaster, {
            isCompleted: data.isFollowing === true,
            verificationError:
              data.isFollowing === true
                ? null
                : "You're not following this account yet.",
          });

          updateTask(TaskId.FollowTwitter, {
            isCompleted: data.tasks?.[TaskId.FollowTwitter]?.completed === true,
            verificationError:
              data.tasks?.[TaskId.FollowTwitter]?.completed === true
                ? null
                : "You're not following this account yet.",
          });
        }

        updateTask(TaskId.FollowInstagram, {
          isCompleted: data.tasks?.[TaskId.FollowInstagram]?.completed === true,
          verificationError:
            data.isFollowing === true
              ? null
              : "You're not following this account yet.",
        });

        updateTask(TaskId.FollowTikTok, {
          isCompleted: data.tasks?.[TaskId.FollowTikTok]?.completed === true,
          verificationError:
            data.tasks?.[TaskId.FollowTikTok]?.completed === true
              ? null
              : "You're not following this account yet.",
        });

        updateTask(TaskId.FollowZora, {
          isCompleted: data.tasks?.[TaskId.FollowZora]?.completed === true,
          verificationError:
            data.tasks?.[TaskId.FollowZora]?.completed === true
              ? null
              : "You're not following this account yet.",
        });

        updateTask(TaskId.JoinTelegram, {
          isCompleted: data.tasks?.[TaskId.JoinTelegram]?.completed === true,
          verificationError:
            data.tasks?.[TaskId.JoinTelegram]?.completed === true
              ? null
              : "You're not following this account yet.",
        });

        // Map API task keys to internal task IDs
        const apiTaskMapping: Record<string, string> = {
          "post-twitter": TaskId.ShareSocial,
        };

        // Update ShareSocial task (mapped from post-twitter API key)
        const shareSocialApiKey =
          Object.keys(apiTaskMapping).find(
            (key) => apiTaskMapping[key] === TaskId.ShareSocial
          ) || TaskId.ShareSocial;
        const shareSocialData =
          data.tasks?.[shareSocialApiKey] || data.tasks?.[TaskId.ShareSocial];

        if (shareSocialData) {
          updateTask(TaskId.ShareSocial, {
            isCompleted: shareSocialData.completed === true,
            verificationError:
              shareSocialData.completed === true
                ? null
                : "Task not completed yet.",
          });
        }
      } catch (e) {
        // silent failure; user can still verify manually
      }
    })();
  }, [isInMiniApp, user?.fid, effectiveAddress, tasks, updateTask]);

  const getRequiredTaskIds = useCallback(
    (): string[] => getRequiredTaskIdsForEnv(isInMiniApp),
    [isInMiniApp]
  );

  // --- Query wrapper for participant snapshot (manual refetch in preflight) ---
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

  const handleClaimAirdrop = async (
    ...args: [refreshOnly?: boolean]
  ): Promise<void> => {
    const refreshOnly: boolean | undefined = args[0];
    setClaimMessage(null);
    setMissingTasks([]);
    setIsPreflighting(true);
    try {
      // Pre-checks: ensure wallet/auth context is present for the flow
      if (!hasWalletAvailable) {
        setClaimMessage("Please connect your wallet to continue.");
        return;
      }
      if (isInMiniApp && !user?.fid) {
        setClaimMessage("Please authenticate with Farcaster in the mini app.");
        return;
      }

      if (isInMiniApp && user?.fid) {
        await handleRefreshVerification();
      }

      let snapshot: ParticipantSnapshot = {};
      if (user?.fid) {
        const result = await refetchSnapshot();
        snapshot = (result.data ?? {}) as ParticipantSnapshot;
      } else {
        // const fidToUse: number | string = -1; // legacy web path
        snapshot = await airdropApi.getParticipantSnapshot({
          walletAddress: effectiveAddress || "",
        });
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
      // Simulate submission to backend
      await new Promise((resolve) => setTimeout(resolve, 800));
      setClaimMessage(
        "success:submitted" // consumed by modal copy in ClaimSection
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
          <BalanceCard balance={balance} />
          <Tabs active={activeTab} onChange={setActiveTab} />
          {activeTab === "tasks" ? (
            <>
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
                onDismissMessage={handleDismissMessage}
                canSubmit={hasWalletAvailable || Boolean(user?.fid)}
              />
            </>
          ) : (
            <LeaderboardTab isInMiniApp={Boolean(isInMiniApp)} />
          )}
        </div>
      </div>
    </main>
  );
}
