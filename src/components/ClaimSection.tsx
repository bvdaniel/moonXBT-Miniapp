import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { type Task } from "@/hooks/useAirdropTasks";

interface ClaimSectionProps {
  isClaiming: boolean;
  isPreflighting: boolean;
  claimMessage: string | null;
  missingTasks: string[];
  tasks: Task[];
  onClaim: () => void;
  onRefresh: () => void;
}

export default function ClaimSection({
  isClaiming,
  isPreflighting,
  claimMessage,
  missingTasks,
  tasks,
  onClaim,
  onRefresh,
}: ClaimSectionProps) {
  return (
    <div className="w-full flex flex-col items-center mt-1">
      <Button
        onClick={onClaim}
        disabled={isPreflighting || isClaiming}
        className="w-full bg-green-600 hover:bg-green-700 mt-2"
      >
        {isClaiming || isPreflighting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
            {isPreflighting ? "Checking requirements..." : "Claiming..."}
          </>
        ) : (
          "Claim Airdrop"
        )}
      </Button>
      {claimMessage && (
        <div
          aria-live="polite"
          className={`mt-2 text-sm ${
            claimMessage.includes("Error") || claimMessage.includes("Failed")
              ? "text-red-400"
              : "text-green-400"
          }`}
          data-testid="claim-message"
        >
          {claimMessage}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {missingTasks.length > 0 && (
          <Button
            onClick={onRefresh}
            className="bg-gray-700 hover:bg-gray-800 text-xs h-6 p-0 px-2 rounded-none"
          >
            Refresh Status
          </Button>
        )}
      </div>
      {missingTasks.length > 0 && (
        <ul
          className="mt-2 text-xs text-blue-100 list-disc list-inside"
          data-testid="missing-task-list"
        >
          {missingTasks.map((id) => {
            const t = tasks.find((x) => x.id === id);
            return (
              <li key={id} data-testid={`missing-task-item-${id}`}>
                {t?.title || id}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
