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
import { airdropApi, type UserInfo } from "@/services/airdropApi";

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
        const twitterTask = tasks.find((t) => t.id === TaskId.FollowTwitter);
        if (twitterTask?.targetUsername) {
          await verifyTwitterFollow(
            user.fid,
            data.twitterAccount,
            twitterTask.targetUsername,
            data.walletAddress,
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
  };

  const { verifyTwitterFollow } = useTwitterVerification(updateTask);

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

  const renderTaskButton = (task: Task) => (
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
      lastPointsRef={lastPointsRef}
      userPoints={userPoints}
      updateTask={updateTask}
      verifyTwitterFollow={verifyTwitterFollow}
      handleRefreshVerification={handleRefreshVerification}
      setUserInfo={setUserInfo}
    />
  );

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
