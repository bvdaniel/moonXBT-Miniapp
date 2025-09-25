import { Button } from "@/components/ui/Button";
import { Loader2 } from "lucide-react";
import { type Task } from "@/hooks/useAirdropTasks";
import * as Dialog from "@radix-ui/react-dialog";

interface ClaimSectionProps {
  isClaiming: boolean;
  isPreflighting: boolean;
  claimMessage: string | null;
  missingTasks: string[];
  tasks: Task[];
  onClaim: () => void;
  onRefresh: () => void;
  onDismissMessage: () => void;
  canSubmit: boolean;
}

export default function ClaimSection({
  isClaiming,
  isPreflighting,
  claimMessage,
  missingTasks,
  tasks,
  onClaim,
  onRefresh,
  onDismissMessage,
  canSubmit,
}: ClaimSectionProps) {
  return (
    <div className="w-full flex flex-col items-center mt-1">
      {/* Permanently disabled Claim button */}
      <Button disabled className="w-full bg-gray-700 mt-2 cursor-not-allowed">
        Claim Airdrop (coming soon)
      </Button>

      {/* Active submit info button */}
      <Button
        onClick={onClaim}
        disabled={isPreflighting || isClaiming || !canSubmit}
        className="w-full bg-green-600 hover:bg-green-700 mt-2"
      >
        {isClaiming || isPreflighting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
            {isPreflighting ? "Checking requirements..." : "Submitting..."}
          </>
        ) : (
          "Submit info for claiming tokens"
        )}
      </Button>
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

      {/* Success Modal */}
      <Dialog.Root
        open={claimMessage === "success:submitted"}
        onOpenChange={(open) => {
          if (!open) onDismissMessage();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white p-4 rounded shadow-lg z-50">
            <Dialog.Title className="text-lg font-semibold mb-2">
              Submission successful
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-200">
              We have successfully submitted your info! Stay tuned to our
              socials — we&apos;ll be publishing the news about the airdrop
              soon. Remember that the points get updated every day, and the
              final round could be sooner than expected ❤️
            </Dialog.Description>
            <div className="mt-4 flex justify-end">
              <Dialog.Close asChild>
                <Button
                  onClick={onDismissMessage}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
