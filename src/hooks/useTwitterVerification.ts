import { useCallback } from "react";
import { airdropApi } from "@/services/airdropApi";
import { TaskId } from "@/constants/tasks";

export function useTwitterVerification(
  updateTask: (taskId: string, updates: any) => void
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
        const twitterData = await airdropApi.verifyTwitterFollow({
          fid,
          twitterUsername,
          targetTwitterUsername,
          walletAddress,
        });

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
