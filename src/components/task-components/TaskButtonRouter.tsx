import { Button } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";
import sdk from "@farcaster/frame-sdk";
import A0XTaskButton from "@/components/task-components/A0XTaskButton";
import ShareMiniappButton from "@/components/task-components/ShareMiniappButton";
import FarcasterTaskButton from "@/components/task-components/FarcasterTaskButton";
import TwitterTaskButton from "@/components/task-components/TwitterTaskButton";
import SocialTaskButton from "@/components/task-components/SocialTaskButton";
import { Task } from "@/hooks/useAirdropTasks";
import { airdropApi, type UserInfo } from "@/services/airdropApi";
import { TaskId } from "@/constants/tasks";
import type { UserContext } from "@farcaster/frame-core/dist/context";

interface TaskButtonRouterProps {
  task: Task;
  isInMiniApp: boolean | null;
  user: UserContext | null;
  userInfo: UserInfo | null;
  addressLowerCase: string;
  balance: string | null;
  isLoadingTokenBalance: boolean;
  hasAnyWallet: boolean;
  userFid?: number;
  address?: string;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  verifyTwitterFollow: (
    fid: number | string | null,
    twitterUsername: string,
    targetTwitterUsername: string,
    walletAddress: string,
    isAlreadyCompleted: boolean,
    onNewlyCompleted?: () => void
  ) => Promise<void>;
  handleRefreshVerification: () => Promise<void>;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo | null>>;
}

export default function TaskButtonRouter({
  task,
  isInMiniApp,
  user,
  userInfo,
  addressLowerCase,
  balance,
  isLoadingTokenBalance,
  hasAnyWallet,
  userFid,
  address,
  updateTask,
  verifyTwitterFollow,
  handleRefreshVerification,
  setUserInfo,
}: TaskButtonRouterProps) {
  if (task.socialNetwork === "a0x") {
    return (
      <A0XTaskButton
        task={task}
        balance={balance}
        isLoadingTokenBalance={isLoadingTokenBalance}
        isConnected={hasAnyWallet}
        userFid={userFid}
        address={address}
        isInMiniApp={isInMiniApp}
      />
    );
  }

  if (task.id === TaskId.ShareSocial) {
    console.warn("[ShareSocial] user", userInfo);

    // if user is null, or undefined, or has no fid, set the actions as disabled, and show a message
    if (
      userInfo === null ||
      userInfo === undefined ||
      userInfo.fid === undefined
    ) {
      return <></>;
    }

    if (isInMiniApp) {
      return (
        <ShareMiniappButton
          task={task}
          user={user}
          userPoints={userInfo?.points as unknown as number}
          onTaskUpdate={updateTask}
        />
      );
    }
    return (
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              console.warn("[ShareSocial] Share button clicked");
              debugger;
              if (task.url) {
                const currentPoints = userInfo?.points as unknown as number;
                const ogImageUrl = `${window.location.origin}/api/og-page?points=${currentPoints}&sharedFid=900682&pfpUrl=https%3A%2F%2Fi.ibb.co%2FQvFx17r6%2Flogo.png`;
                const twitterUrl = `${task.url}&url=${encodeURIComponent(
                  ogImageUrl
                )}`;
                window.open(twitterUrl, "_blank");
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
          <span className="text-xs text-red-400">{task.verificationError}</span>
        )}
      </div>
    );
  }

  if (task.id === TaskId.FollowFarcaster) {
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
            } catch (error) {
              updateTask(task.id, {
                verificationError:
                  error instanceof Error
                    ? error.message
                    : "Error verifying follow status.",
              });
            }
          }
        }}
        isInMiniApp={isInMiniApp}
      />
    );
  }

  if (task.id === TaskId.FollowTwitter) {
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
        onTwitterSubmit={async (typedUsername: string) => {
          if (!task.targetUsername) return;
          const fidToUse = user?.fid ?? null;
          const walletToUse = userInfo?.walletAddress || addressLowerCase || "";
          console.warn(
            "[Twitter] onTwitterSubmit invoked",
            JSON.stringify(
              {
                fid: fidToUse,
                wallet: walletToUse,
                target: task.targetUsername,
                typedUsername,
                infoTwitter: userInfo?.twitterAccount || null,
              },
              null,
              2
            )
          );
          await verifyTwitterFollow(
            fidToUse,
            typedUsername,
            task.targetUsername,
            walletToUse,
            task.isCompleted,
            () => undefined
          );
        }}
        onRefresh={handleRefreshVerification}
        isInMiniApp={isInMiniApp}
      />
    );
  }

  if (
    task.id === TaskId.FollowTikTok ||
    task.id === TaskId.FollowInstagram ||
    task.id === TaskId.JoinTelegram ||
    task.id === TaskId.FollowZora
  ) {
    return (
      <SocialTaskButton
        task={task}
        user={user}
        userInfo={userInfo}
        onTaskUpdate={updateTask}
        onUsernameSubmit={async (platform, username) => {
          const resp = await airdropApi.registerSocialTask(
            platform as
              | "instagram"
              | "tiktok"
              | "telegram"
              | "zora"
              | "farcaster",
            {
              farcasterFid: Number(userInfo?.fid || user?.fid) || null,
              username,
              targetUsername: task.targetUsername || "",
              walletAddress: addressLowerCase || "",
            }
          );
          if (resp.dataReceived?.success === true) {
            setUserInfo((prev) => {
              if (!prev) return prev;
              const prevTask =
                (prev.tasks?.[task.id] as Record<string, unknown>) || {};
              if (platform === "telegram") {
                return {
                  ...prev,
                  tasks: {
                    ...prev.tasks,
                    [task.id]: { ...prevTask, telegramUsername: username },
                  },
                } as UserInfo;
              }
              return {
                ...prev,
                tasks: {
                  ...prev.tasks,
                  [task.id]: {
                    ...prevTask,
                    verificationDetails: {
                      ...((
                        prevTask as {
                          verificationDetails?: Record<string, unknown>;
                        }
                      ).verificationDetails || {}),
                      checkedUsername: username,
                    },
                  },
                },
              } as UserInfo;
            });
          }
        }}
        isInMiniApp={isInMiniApp}
      />
    );
  }

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
}
