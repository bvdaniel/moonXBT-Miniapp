import * as React from "react";
import { useReducer, useCallback } from "react";
import { Circle, MessageCircle, Play, Send } from "lucide-react";
import Image from "next/image";
import { FaInstagram, FaTelegram, FaTiktok } from "react-icons/fa";
import Link from "next/link";
import { TaskId, MIN_A0X_REQUIRED } from "@/constants/tasks";

export interface Task {
  id: string;
  title: string;
  description: string | React.ReactNode;
  socialNetwork:
    | "farcaster"
    | "twitter"
    | "tiktok"
    | "instagram"
    | "telegram"
    | "a0x"
    | "zora";
  isRequired: boolean;
  isCompleted: boolean;
  needsAuth: boolean;
  url?: string;
  icon: React.ReactNode;
  targetUsername?: string;
  verificationError?: string | null;
  action?: () => void;
  points: number;
  pointsDescription?: string;
}

type TaskAction =
  | { type: "INITIALIZE_TASKS"; tasks: Task[] }
  | { type: "UPDATE_TASK"; taskId: string; updates: Partial<Task> }
  | {
      type: "UPDATE_MULTIPLE_TASKS";
      updates: { taskId: string; updates: Partial<Task> }[];
    }
  | { type: "RESET_TASK"; taskId: string }
  | { type: "RESET_ALL_TASKS" };

const taskReducer = (state: Task[], action: TaskAction): Task[] => {
  switch (action.type) {
    case "INITIALIZE_TASKS":
      return action.tasks;

    case "UPDATE_TASK":
      return state.map((task) =>
        task.id === action.taskId ? { ...task, ...action.updates } : task
      );

    case "UPDATE_MULTIPLE_TASKS":
      return state.map((task) => {
        const update = action.updates.find((u) => u.taskId === task.id);
        return update ? { ...task, ...update.updates } : task;
      });

    case "RESET_TASK":
      return state.map((task) =>
        task.id === action.taskId
          ? {
              ...task,
              isCompleted: false,
              verificationError: null,
              points: task.id === TaskId.HoldA0X ? 10 : task.points,
              pointsDescription:
                task.id === TaskId.HoldA0X
                  ? "10 points for holding 10M A0X, +1 point per 1M A0X"
                  : task.pointsDescription,
            }
          : task
      );

    case "RESET_ALL_TASKS":
      return state.map((task) => ({
        ...task,
        isCompleted: false,
        verificationError: null,
        points: task.id === TaskId.HoldA0X ? 10 : task.points,
        pointsDescription:
          task.id === TaskId.HoldA0X
            ? "10 points for holding 10M A0X, +1 point per 1M A0X"
            : task.pointsDescription,
      }));

    default:
      return state;
  }
};

const parseTextMillion = (amount: number) => {
  return `${Math.floor(amount / 1_000_000)}M`;
};

export const useAirdropTasks = (isInMiniApp: boolean = true) => {
  const [tasks, dispatch] = useReducer(taskReducer, []);

  const initializeTasks = useCallback(() => {
    dispatch({
      type: "INITIALIZE_TASKS",
      tasks: [
        {
          id: TaskId.HoldA0X,
          title: "Hold A0X Tokens",
          description: `Hold at least ${parseTextMillion(
            MIN_A0X_REQUIRED
          )} A0X tokens`,
          socialNetwork: "a0x",
          isRequired: true,
          isCompleted: false,
          needsAuth: false,
          icon: (
            <Image
              src="/a0x.webp"
              alt="A0X"
              width={16}
              height={16}
              className="rounded-full"
            />
          ),
          verificationError: null,
          points: 10,
          pointsDescription:
            "10 points for holding 10M A0X, +1 point per 1M A0X",
        },
        {
          id: TaskId.FollowFarcaster,
          title: `Follow on Farcaster${!isInMiniApp ? " (Optional)" : ""}`,
          description: (
            <span>
              Follow{" "}
              <Link
                target="_blank"
                href="https://farcaster.xyz/ai420z"
                className="text-blue-50"
              >
                @ai420z
              </Link>
            </span>
          ),
          socialNetwork: "farcaster",
          isRequired: isInMiniApp,
          isCompleted: false,
          needsAuth: true,
          url: "https://farcaster.xyz/ai420z",
          targetUsername: "ai420z",
          icon: (
            <Image
              src="/farcaster.png"
              alt="Farcaster"
              width={16}
              height={16}
              className=""
            />
          ),
          verificationError: null,
          points: 100,
        },
        {
          id: TaskId.FollowTwitter,
          title: "Follow on X",
          description: (
            <span>
              Follow{" "}
              <Link
                target="_blank"
                href="https://x.com/moonXBT_ai"
                className="text-blue-50"
              >
                @moonXBT_ai
              </Link>
            </span>
          ),
          socialNetwork: "twitter",
          isRequired: true,
          isCompleted: false,
          needsAuth: true,
          url: "https://x.com/moonXBT_ai",
          targetUsername: "moonXBT_ai",
          icon: (
            <div className="bg-black rounded-sm p-0.5 flex items-center justify-center w-4 h-4">
              <Image
                src="/x.png"
                alt="X"
                width={14}
                height={14}
                className="rounded-full"
              />
            </div>
          ),
          verificationError: null,
          points: 100,
        },
        {
          id: TaskId.FollowTikTok,
          title: "Follow on TikTok (Optional)",
          description: (
            <span>
              Follow{" "}
              <Link
                target="_blank"
                href="https://www.tiktok.com/@moonxbt.fun"
                className="text-blue-50"
              >
                @moonxbt.fun
              </Link>
            </span>
          ),
          socialNetwork: "tiktok",
          isRequired: false,
          isCompleted: false,
          needsAuth: false,
          url: "https://www.tiktok.com/@moonxbt.fun",
          icon: (
            <div className="bg-black rounded-sm p-0.5 flex items-center justify-center w-4 h-4">
              <FaTiktok className="w-3 h-3 text-white" />
            </div>
          ),
          verificationError: null,
          targetUsername: "@moonxbt.fun",
          points: 100,
        },
        {
          id: TaskId.FollowInstagram,
          title: "Follow on Instagram (Optional)",
          description: (
            <span>
              Follow{" "}
              <Link
                target="_blank"
                href="https://www.instagram.com/moonxbt_ai/"
                className="text-blue-50"
              >
                @moonxbt_ai
              </Link>
            </span>
          ),
          socialNetwork: "instagram",
          isRequired: false,
          isCompleted: false,
          needsAuth: false,
          url: "https://www.instagram.com/moonxbt_ai/",
          icon: (
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 rounded-sm p-0.5 flex items-center justify-center w-4 h-4">
              <FaInstagram className="w-3 h-3 text-white" />
            </div>
          ),
          verificationError: null,
          targetUsername: "moonxbt_ai",
          points: 100,
        },
        {
          id: TaskId.JoinTelegram,
          title: "Join Telegram (Optional)",
          description: (
            <span>
              Join{" "}
              <Link
                target="_blank"
                href="https://t.me/A0X_Portal"
                className="text-blue-50"
              >
                A0X Portal
              </Link>{" "}
              group
            </span>
          ),
          socialNetwork: "telegram",
          isRequired: false,
          isCompleted: false,
          needsAuth: false,
          url: "https://t.me/A0X_Portal",
          icon: (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm p-0.5 flex items-center justify-center w-4 h-4">
              <FaTelegram className="w-3 h-3 text-white" />
            </div>
          ),
          verificationError: null,
          targetUsername: "A0X_Portal",
          points: 100,
        },
        {
          id: TaskId.FollowZora,
          title: "Follow on Zora",
          description: (
            <span>
              Follow{" "}
              <Link
                target="_blank"
                href="https://zora.co/moonxbt"
                className="text-blue-50"
              >
                @moonxbt
              </Link>
            </span>
          ),
          socialNetwork: "zora",
          isRequired: false,
          isCompleted: false,
          needsAuth: false,
          url: "https://zora.co/moonxbt",
          icon: (
            <Image
              src="/zora.png"
              alt="Zora"
              width={14}
              height={14}
              className="rounded-full"
            />
          ),
          verificationError: null,
          points: 100,
          targetUsername: "moonxbt",
        },
        {
          id: TaskId.ShareSocial,
          title: isInMiniApp ? "Share Mini App" : "Share on X (Twitter)",
          description: isInMiniApp ? (
            <span>Share on Farcaster (50pts + 10/referral)</span>
          ) : (
            <span>Share the airdrop on X/Twitter</span>
          ),
          socialNetwork: isInMiniApp ? "farcaster" : "twitter",
          isRequired: !isInMiniApp,
          isCompleted: false,
          needsAuth: false,
          url: isInMiniApp
            ? undefined
            : `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                "🚀 Join the @moonXBT_ai airdrop! Complete tasks to earn your share of tokens 🌙✨\n\n#moonXBT #Airdrop #Crypto"
              )}&url=${encodeURIComponent("https://moonxbt.fun")}`,
          icon: isInMiniApp ? (
            <MessageCircle className="w-4 h-4 text-purple-500" />
          ) : (
            <div className="bg-black rounded-sm p-0.5 flex items-center justify-center w-4 h-4">
              <Image
                src="/x.png"
                alt="X"
                width={14}
                height={14}
                className="rounded-full"
              />
            </div>
          ),
          verificationError: null,
          points: isInMiniApp ? 50 : 100,
          pointsDescription: isInMiniApp
            ? "50 points for sharing + 10 points per referral"
            : "100 points for sharing the airdrop on X",
        },
      ],
    });
  }, [isInMiniApp]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dispatch({ type: "UPDATE_TASK", taskId, updates });
  }, []);

  const updateMultipleTasks = useCallback(
    (updates: { taskId: string; updates: Partial<Task> }[]) => {
      dispatch({ type: "UPDATE_MULTIPLE_TASKS", updates });
    },
    []
  );

  const resetTask = useCallback((taskId: string) => {
    dispatch({ type: "RESET_TASK", taskId });
  }, []);

  const resetAllTasks = useCallback(() => {
    dispatch({ type: "RESET_ALL_TASKS" });
  }, []);

  const requiredTasks = tasks.filter((task) => task.isRequired);
  const optionalTasks = tasks.filter((task) => !task.isRequired);
  const completedRequiredTasks = requiredTasks.filter(
    (task) => task.isCompleted
  ).length;
  const completedOptionalTasks = optionalTasks.filter(
    (task) => task.isCompleted
  ).length;

  return {
    tasks,
    requiredTasks,
    optionalTasks,
    completedRequiredTasks,
    completedOptionalTasks,
    initializeTasks,
    updateTask,
    updateMultipleTasks,
    resetTask,
    resetAllTasks,
  };
};

// Resolve required task ids based on environment (miniapp vs web)
export function getRequiredTaskIdsForEnv(
  isInMiniApp: boolean | null | undefined
): TaskId[] {
  return isInMiniApp
    ? [TaskId.HoldA0X, TaskId.FollowFarcaster]
    : [TaskId.HoldA0X, TaskId.FollowTwitter, TaskId.ShareSocial];
}
