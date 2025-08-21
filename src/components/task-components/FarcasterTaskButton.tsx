import { Button } from "@/components/ui/Button";
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { Task } from "@/hooks/useAirdropTasks";
import { TaskId } from "@/constants/tasks";
import sdk from "@farcaster/frame-sdk";
import { useState } from "react";

interface FarcasterTaskButtonProps {
  task: Task;
  user: { fid?: number } | null;
  isVerifyingFarcaster: boolean;
  isRefreshing: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onVerifyFollow: (username: string) => Promise<void>;
  isInMiniApp?: boolean | null;
}

export default function FarcasterTaskButton({
  task,
  user,
  isVerifyingFarcaster,
  isRefreshing,
  onTaskUpdate,
  onVerifyFollow,
  isInMiniApp,
}: FarcasterTaskButtonProps) {
  const [showInput, setShowInput] = useState(false);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExternalLink = (url: string) => {
    if (isInMiniApp) {
      sdk.actions.openUrl(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleVerifyFarcasterFollow = async () => {
    if (user?.fid) {
      await onVerifyFollow(username);
    } else {
      onTaskUpdate(TaskId.FollowFarcaster, {
        verificationError: "You need to authenticate with Farcaster first.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!username) return;
    setIsSubmitting(true);
    try {
      await onVerifyFollow(username);
      setShowInput(false);
      setUsername("");
    } catch (error) {
      console.error("Error verifying Farcaster follow:", error);
      onTaskUpdate(TaskId.FollowFarcaster, {
        verificationError: "Failed to verify. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-end space-y-1 text-right">
      <div className="flex items-center space-x-2">
        {isVerifyingFarcaster || isRefreshing ? (
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
            {!isInMiniApp && (
              <Button
                onClick={() => setShowInput(!showInput)}
                className="bg-gray-600 hover:bg-gray-700 text-xs text-white rounded-none h-6 w-6 p-0"
                title="Add Farcaster username manually"
              >
                {showInput ? <X className="w-3 h-3" /> : <span>+</span>}
              </Button>
            )}
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

      {showInput && !task.isCompleted && !isInMiniApp && (
        <div className="mt-2 flex items-center space-x-2 animate-fade-in w-full justify-end">
          <input
            type="text"
            placeholder="@Farcaster username"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace("@", ""))}
            className="bg-gray-700 text-white text-xs rounded px-2 py-1 flex-grow max-w-[150px] sm:max-w-[120px]"
          />
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
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

      {task.verificationError && (
        <span className="text-xs text-red-400 mt-1 text-right w-full">
          {task.verificationError}
        </span>
      )}
    </div>
  );
}
