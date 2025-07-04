import { Button } from "@/components/ui/Button";
import { Task } from "@/hooks/useAirdropTasks";
import { UserContext } from "@farcaster/frame-core/dist/context";
import sdk from "@farcaster/frame-sdk";
import { CheckCircle2, ExternalLink } from "lucide-react";

interface ShareMiniappButtonProps {
  task: Task;
  user: UserContext | null;
  lastPointsRef: React.MutableRefObject<number | null>;
  userPoints: number;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export default function ShareMiniappButton({
  task,
  user,
  lastPointsRef,
  userPoints,
  onTaskUpdate,
}: ShareMiniappButtonProps) {
  const handleShare = async () => {
    if (user?.fid) {
      try {
        const currentPoints =
          lastPointsRef.current !== null ? lastPointsRef.current : userPoints;

        const result = await sdk.actions.composeCast({
          text: `I'm participating in $moonXBT airdrop, the first autonomous content creator on Base! I've earned ${currentPoints} points so far!`,
          embeds: [
            `https://moon-xbt-miniapp.vercel.app/?sharedFid=${user.fid}`,
          ],
        });

        if (result?.cast) {
          onTaskUpdate("share-social", { isCompleted: true });
        }
      } catch (error) {
        console.error("Error sharing mini app:", error);
        onTaskUpdate("share-social", {
          verificationError: "Error sharing mini app",
        });
      }
    } else {
      const currentPoints =
        lastPointsRef.current !== null ? lastPointsRef.current : userPoints;
      window.open(
        `https://farcaster.xyz/~/compose?text=I'm%20participating%20in%20$moonXBT%20airdrop,%20the%20first%20autonomous%20content%20creator%20on%20Base!%20I've%20earned%20${currentPoints}%20points%20so%20far!`,
        "_blank"
      );
    }
  };

  return (
    <div className="flex flex-col items-end space-y-1 text-right">
      <div className="flex items-center space-x-2">
        {task.isCompleted ? (
          <div className="flex items-center space-x-1 bg-green-500/20 rounded-none h-6 p-0 px-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-400">Shared</span>
          </div>
        ) : (
          <Button
            onClick={handleShare}
            className="bg-purple-600 hover:bg-purple-700 text-xs rounded-none h-6 p-0 px-1 text-white"
            title="Share on Farcaster"
          >
            Share <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
      {task.verificationError && (
        <span className="text-xs text-red-400">{task.verificationError}</span>
      )}
    </div>
  );
}
