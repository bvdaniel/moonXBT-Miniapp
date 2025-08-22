import { useCallback } from "react";
import { airdropApi } from "@/services/airdropApi";
import { TaskId } from "@/constants/tasks";
import type { Task } from "@/hooks/useAirdropTasks";

export function useTwitterVerification(
  updateTask: (taskId: string, updates: Partial<Task>) => void
) {
  const verifyTwitterFollow = useCallback(
    async (
      fid: number | string | null,
      twitterUsername: string,
      targetTwitterUsername: string,
      walletAddress: string,
      isAlreadyCompleted: boolean,
      onNewlyCompleted?: () => void
    ) => {
      try {
        console.warn(
          "[Twitter] Starting verification",
          JSON.stringify(
            { fid, twitterUsername, targetTwitterUsername, walletAddress },
            null,
            2
          )
        );
        const twitterData = await airdropApi.verifyTwitterFollow({
          fid,
          twitterUsername,
          targetTwitterUsername,
          walletAddress,
        });

        console.warn(
          "[Twitter] Agent response",
          JSON.stringify(twitterData, null, 2)
        );
        updateTask(TaskId.FollowTwitter, {
          isCompleted: twitterData.dataReceived.isFollowing === true,
          verificationError:
            twitterData.dataReceived.isFollowing === true
              ? null
              : "You're not following this account yet.",
        });

        if (
          twitterData.dataReceived.isFollowing === true &&
          !isAlreadyCompleted
        ) {
          console.warn("[Twitter] Newly completed; awarding points callback");
          onNewlyCompleted?.();
        }
      } catch (error) {
        console.error("Error verifying Twitter follow:", error);
        updateTask(TaskId.FollowTwitter, {
          verificationError: "Error verifying Twitter follow status.",
        });
      }
    },
    [updateTask]
  );

  return { verifyTwitterFollow };
}
