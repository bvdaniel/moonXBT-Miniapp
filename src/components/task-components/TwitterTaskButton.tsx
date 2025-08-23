import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Task } from "@/hooks/useAirdropTasks";
import { TaskId } from "@/constants/tasks";
import { UserInfo } from "@/services/airdropApi";
import sdk from "@farcaster/frame-sdk";

interface TwitterTaskButtonProps {
  task: Task;
  user: { fid?: number } | null;
  userInfo: UserInfo | null;
  isVerifyingTwitter: boolean;
  isVerifyingFarcaster: boolean;
  isVerifyingAll: boolean;
  isRefreshing: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTwitterSubmit: (username: string) => Promise<void>;
  onRefresh: () => void;
  isInMiniApp: boolean | null;
}

export default function TwitterTaskButton({
  task,
  user,
  userInfo,
  isVerifyingTwitter,
  isVerifyingFarcaster,
  isVerifyingAll,
  isRefreshing,
  onTaskUpdate,
  onTwitterSubmit,
  onRefresh,
  isInMiniApp,
}: TwitterTaskButtonProps) {
  const [showTwitterInput, setShowTwitterInput] = useState(false);
  const [twitterUsername, setTwitterUsername] = useState("");
  const [isSubmittingTwitter, setIsSubmittingTwitter] = useState(false);

  const handleExternalLink = (url: string) => {
    if (isInMiniApp) {
      sdk.actions.openUrl(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleSubmitTwitterUsername = async () => {
    if (!twitterUsername) return;

    setIsSubmittingTwitter(true);
    try {
      console.warn(
        "[Twitter] Username submitted by user",
        JSON.stringify({ username: twitterUsername }, null, 2)
      );
      await onTwitterSubmit(twitterUsername);
      setShowTwitterInput(false);
    } catch (error) {
      console.error("Error verifying Twitter follow:", error);
      onTaskUpdate(TaskId.FollowTwitter, {
        verificationError: "Network error during verification.",
      });
    } finally {
      setIsSubmittingTwitter(false);
    }
  };

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
                title="Open Twitter to follow"
              >
                Follow <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}
        </div>
        {task.verificationError && (
          <span className="text-xs text-red-400">{task.verificationError}</span>
        )}
      </div>
    );
  }

  // If there's no linked Twitter account
  return (
    <div className="flex flex-col items-end space-y-1 text-right">
      {isVerifyingTwitter || isVerifyingFarcaster ? (
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      ) : (
        <div className="flex items-center space-x-2">
          {/* <Button
            onClick={() =>
              handleExternalLink("https://farcaster.xyz/~/settings")
            }
            className="bg-purple-600 hover:bg-purple-700 text-xs h-6 p-0 px-1 rounded-none text-white"
            title="Verify on Farcaster"
          >
            Verify on Farcaster <ExternalLink className="w-3 h-3 ml-1" />
          </Button> */}
          <Button
            onClick={() => setShowTwitterInput(!showTwitterInput)}
            className="bg-gray-800 hover:bg-gray-900 text-xs h-6 w-6 p-0 rounded-none text-white"
            title="Add manually"
          >
            {showTwitterInput ? <X className="w-3 h-3" /> : <span>+</span>}
          </Button>
          <Button
            onClick={onRefresh}
            disabled={isRefreshing || (!user?.fid && !isInMiniApp)}
            className="bg-gray-800 hover:bg-gray-900 text-xs h-6 w-6 p-0 rounded-none text-white"
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
            className="bg-gray-700 text-white text-xs rounded w-full px-2 py-1 flex-grow max-w-[120px]"
          />
          <Button
            onClick={handleSubmitTwitterUsername}
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
          <span className="text-xs text-gray-400">X account not linked</span>
        </div>
      )}

      {task.verificationError && (
        <span className="text-xs text-red-400">{task.verificationError}</span>
      )}
    </div>
  );
}
