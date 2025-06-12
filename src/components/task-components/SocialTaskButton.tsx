import { Button } from "@/components/ui/Button";
import { Task } from "@/hooks/useAirdropTasks";
import { UserInfo } from "@/services/airdropApi";
import sdk from "@farcaster/frame-sdk";
import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { useState } from "react";

interface SocialTaskButtonProps {
  task: Task;
  user: { fid?: number } | null;
  userInfo: UserInfo | null;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onUsernameSubmit: (platform: string, username: string) => Promise<void>;
  isInMiniApp?: boolean | null;
}

export default function SocialTaskButton({
  task,
  user,
  userInfo,
  onTaskUpdate,
  onUsernameSubmit,
  isInMiniApp,
}: SocialTaskButtonProps) {
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

  const getSocialName = () => {
    switch (task.socialNetwork) {
      case "instagram":
        return "Instagram";
      case "tiktok":
        return "TikTok";
      case "zora":
        return "Zora";
      case "telegram":
        return "Telegram";
      default:
        return task.socialNetwork;
    }
  };

  const getPreviousUsername = (): string | null => {
    if (task.socialNetwork === "tiktok" || task.socialNetwork === "instagram") {
      return userInfo?.tasks?.[task.id]?.verificationDetails?.checkedUsername
        ? String(userInfo.tasks[task.id].verificationDetails.checkedUsername)
        : null;
    }
    return userInfo?.tasks?.[task.id]?.telegramUsername
      ? String(userInfo.tasks[task.id].telegramUsername)
      : null;
  };

  const handleSubmit = async () => {
    if (!username || (isInMiniApp && !user?.fid)) return;

    setIsSubmitting(true);
    try {
      await onUsernameSubmit(task.socialNetwork, username);
      setShowInput(false);
      setUsername("");
    } catch (error) {
      console.error(`Error submitting ${task.socialNetwork} username:`, error);
      onTaskUpdate(task.id, {
        verificationError: "Failed to register. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previousUsername = getPreviousUsername();
  const socialName = getSocialName();

  return (
    <div className="flex flex-col items-end space-y-1 text-right">
      {!task.isCompleted && (
        <div className="flex items-center space-x-2">
          {previousUsername && (
            <span className="text-xs text-gray-300">@{previousUsername}</span>
          )}
          <Button
            onClick={() => handleExternalLink(task.url!)}
            className="bg-gray-800 hover:bg-gray-900 text-xs p-0 px-1 h-6 text-white rounded-none"
            title={`Open ${socialName}`}
            size="sm"
          >
            Open <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          <Button
            onClick={() => {
              setShowInput(!showInput);
              if (previousUsername) {
                setUsername(previousUsername);
              }
            }}
            className="bg-gray-800 hover:bg-gray-900 text-xs text-white rounded-none h-6 w-6 p-0"
            title={`Add ${socialName} username manually`}
          >
            {showInput ? <X className="w-3 h-3" /> : <span>+</span>}
          </Button>
        </div>
      )}

      {showInput && !task.isCompleted && (
        <div className="mt-2 flex items-center space-x-2 animate-fade-in w-full justify-end">
          <input
            type="text"
            placeholder={`@${socialName} username`}
            value={username}
            onChange={(e) => setUsername(e.target.value.replace("@", ""))}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 flex-grow max-w-[150px] sm:max-w-[120px]"
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

      {task.isCompleted && (
        <div className="flex items-center space-x-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-400">Completed</span>
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
