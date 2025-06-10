import { Button } from "@/components/ui/Button";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Task } from "@/hooks/useAirdropTasks";
import sdk from "@farcaster/frame-sdk";

interface FarcasterTaskButtonProps {
  task: Task;
  user: { fid?: number } | null;
  isVerifyingFarcaster: boolean;
  isRefreshing: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onVerifyFollow: () => Promise<void>;
}

export default function FarcasterTaskButton({
  task,
  user,
  isVerifyingFarcaster,
  isRefreshing,
  onTaskUpdate,
  onVerifyFollow,
}: FarcasterTaskButtonProps) {
  const handleExternalLink = (url: string) => {
    sdk.actions.openUrl(url);
  };

  const handleVerifyFarcasterFollow = async () => {
    if (user?.fid) {
      await onVerifyFollow();
    } else {
      onTaskUpdate("follow-farcaster", {
        verificationError: "You need to authenticate with Farcaster first.",
      });
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
    </div>
  );
}
