"use client";
import { Button } from "@/components/ui/Button"; // Asegúrate que esta ruta es correcta
import sdk from "@farcaster/frame-sdk";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  MessageCircle,
  Play,
  Send,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";

import Image from "next/image";
import { FaInstagram, FaTiktok, FaTelegram } from 'react-icons/fa';
import { SiFarcaster } from 'react-icons/si';

// A0X Token Contract ABI - only the balanceOf function
const tokenABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const A0X_TOKEN_ADDRESS = "0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7";
const MIN_A0X_REQUIRED = 100;

interface Task {
  id: string;
  title: string;
  description: string;
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
  verificationError?: string | null; // Para mostrar errores específicos de la tarea
  action?: () => void;
}

interface VerificationResult {
  taskId: string;
  isCompleted: boolean;
  error?: string;
}

const asciiLogoLines = [
  "                                               /$$    /$$ /$$$$$$$  /$$$$$$$$",
  "                                               | $$  / $$| $$__  $$|__  $$__/",
  " /$$$$$$/$$$$   /$$$$$$   /$$$$$$  /$$$$$$$ |  $$/ $$/| $$    $$   | $$",
  "| $$_  $$_  $$ /$$__  $$ /$$__  $$| $$__  $$    $$$$/ | $$$$$$$    | $$",   
  "| $$   $$   $$| $$    $$| $$    $$| $$    $$  >$$  $$ | $$__  $$   | $$",   
  "| $$ | $$ | $$| $$  | $$| $$  | $$| $$  | $$ /$$/   $$| $$    $$   | $$",  
  "| $$ | $$ | $$|  $$$$$$/|  $$$$$$/| $$  | $$| $$    $$| $$$$$$$/   | $$",   
  "|__/ |__/ |__/  ______/   ______/ |__/  |__/|__/  |__/|_______/    |__/",                                                                                                                         
  ]; 

export default function UpdatedAirdropComponent() {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount(); // connector puede ser útil
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false); // Renombrado para claridad
  const [balance, setBalance] = useState<string | null>(null);
  const [asciiLinesToShow, setAsciiLinesToShow] = useState(0);

  const {
    data: tokenBalanceData,
    isLoading: isLoadingTokenBalance,
    error: tokenBalanceError,
  } = useReadContract({
    address: A0X_TOKEN_ADDRESS,
    abi: tokenABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 15000, // Opcional: refrescar balance periódicamente
    },
  });

  useEffect(() => {
    // Hide splash screen when component mounts
    sdk.actions.ready();
  }, []);

  // Inicializar tareas
  useEffect(() => {
    setTasks([
      {
        id: "hold-a0x",
        title: "Hold A0X Tokens",
        description: `Hold at least ${MIN_A0X_REQUIRED} A0X tokens`,
        socialNetwork: "a0x",
        isRequired: true,
        isCompleted: false,
        needsAuth: false,
        icon: <Circle className="w-5 h-5 text-yellow-500" />,
        verificationError: null,
      },
      {
        id: "follow-farcaster",
        title: "Follow on Farcaster",
        description: "Follow @ai420z",
        socialNetwork: "farcaster",
        isRequired: true,
        isCompleted: false,
        needsAuth: true,
        url: "https://warpcast.com/ai420z",
        targetUsername: "ai420z",
        icon: <MessageCircle className="w-5 h-5 text-purple-500" />,
        verificationError: null,
      },
      {
        id: "follow-twitter",
        title: "Follow on X (Twitter)",
        description: "Follow @moonXBT_ai",
        socialNetwork: "twitter",
        isRequired: true,
        isCompleted: false,
        needsAuth: true,
        url: "https://x.com/moonXBT_ai",
        targetUsername: "moonXBT_ai",
        icon: <Image src="/x.png" alt="X" width={20} height={20} className="inline-block mr-2" />,
        verificationError: null,
      },
      {
        id: "follow-tiktok",
        title: "Follow on TikTok (Optional)",
        description: "Follow @moonxbt.fun",
        socialNetwork: "tiktok",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://www.tiktok.com/@moonxbt.fun",
        icon: <Play className="w-5 h-5 text-red-500" />,
        verificationError: null,
      },
      {
        id: "follow-instagram",
        title: "Follow on Instagram (Optional)",
        description: "Follow @moonxbt_ai",
        socialNetwork: "instagram",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://www.instagram.com/moonxbt_ai/",
        icon: <FaInstagram className="w-5 h-5 text-pink-500" />,
        verificationError: null,
      },
      {
        id: "join-telegram",
        title: "Join Telegram (Optional)",
        description: "Join A0X Portal group",
        socialNetwork: "telegram",
        isRequired: false,
        isCompleted: false, // Asumimos que no se verifica automáticamente
        needsAuth: false,
        url: "https://t.me/A0X_Portal",
        icon: <Send className="w-5 h-5 text-blue-500" />,
        verificationError: null,
      },
      {
        id: "follow-zora",
        title: "Follow on Zora",
        description: "Follow @moonxbt_ai",
        socialNetwork: "zora",
        isRequired: false,
        isCompleted: false,
        needsAuth: false,
        url: "https://zora.co/moonxbt_ai",
        icon: <Image src="/zora.png" alt="Zora" width={20} height={20} className="inline-block mr-2" />,
        verificationError: null,
      },
    ]);
  }, []);

  // Actualizar balance y tarea de A0X
  useEffect(() => {
    if (tokenBalanceData) {
      const balanceNum = Number(formatEther(tokenBalanceData));
      setBalance(balanceNum.toString());

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "hold-a0x"
            ? {
                ...task,
                isCompleted: balanceNum >= MIN_A0X_REQUIRED,
                verificationError: null,
              }
            : task
        )
      );
    } else if (tokenBalanceError) {
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === "hold-a0x"
            ? {
                ...task,
                isCompleted: false,
                verificationError: "Error fetching balance.",
              }
            : task
        )
      );
    }
  }, [tokenBalanceData, tokenBalanceError, address]);

  // Verificar todas las tareas cuando cambie la sesión, la wallet o el balance
  // Solo si hay sesión, wallet conectada y balance disponible
  useEffect(() => {
    if (sessionStatus === "authenticated" && address && balance !== null) {
      verifyAllTasks();
    }
  }, [sessionStatus, address, balance]); // `session` object itself can cause too many re-renders if not careful

  const verifyAllTasks = async () => {
    if (!address || balance === null || sessionStatus !== "authenticated") {
      // No verificar si no hay wallet, balance o sesión
      // Podrías querer actualizar los errores de las tareas a "Wallet not connected" o "Sign in needed"
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.needsAuth && sessionStatus !== "authenticated") {
            return { ...task, verificationError: "Sign in to verify." };
          }
          if (task.id === "hold-a0x" && !isConnected) {
            return { ...task, verificationError: "Connect wallet to verify." };
          }
          return task;
        })
      );
      return;
    }

    setIsVerifyingAll(true);
    try {
      const response = await fetch("/api/verify-all-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenBalance: Number(balance), // El backend ya lo verifica, pero lo enviamos
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updateTasksFromVerification(data.results);
        if (data.eligibleForAirdrop) {
          // Opcional: podrías setear un estado aquí si quieres
        }
      } else {
        // Error general de la API de verificación
        const errorData = await response.json();
        console.error("verify-all-tasks API error:", errorData);
        // Podrías marcar todas las tareas no completadas con un error genérico
        setTasks((prevTasks) =>
          prevTasks.map((t) => ({
            ...t,
            verificationError: t.isCompleted
              ? null
              : "Verification failed. Please try again.",
          }))
        );
      }
    } catch (error) {
      console.error("Task verification failed:", error);
      setTasks((prevTasks) =>
        prevTasks.map((t) => ({
          ...t,
          verificationError: t.isCompleted
            ? null
            : "Network error during verification.",
        }))
      );
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const updateTasksFromVerification = (results: VerificationResult[]) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        const result = results.find((r) => r.taskId === task.id);
        if (result) {
          return {
            ...task,
            isCompleted: result.isCompleted,
            verificationError: result.error || null,
          };
        }
        // Si una tarea no está en los resultados (p.ej. 'hold-a0x' que se maneja localmente)
        // mantener su estado, pero limpiar el error si la API no lo devolvió
        if (task.id === "hold-a0x") return task; // Ya manejado por useEffect de balance
        return { ...task, verificationError: null }; // Limpiar errores si la API no los reportó para esta tarea
      })
    );
  };

  const handleSocialAuth = async (provider: "farcaster" | "twitter") => {
    try {
      // El redirect se maneja en la config de NextAuth. Se recargará la página.
      // signIn no devuelve una promesa que resuelva después de la autenticación en la misma página,
      // sino que inicia el flujo OAuth.
      await signIn(provider);
    } catch (error) {
      console.error(`${provider} authentication failed:`, error);
      // Actualizar la tarea específica con un error
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.socialNetwork === provider
            ? { ...task, verificationError: `Failed to connect ${provider}.` }
            : task
        )
      );
    }
  };

  const handleExternalLink = (url: string) => {
    window.open(url, "_blank");
    // Para tareas no verificables automáticamente (TikTok, Instagram, Telegram),
    // podríamos marcarlas como "intentadas" o "completadas manualmente" si se desea.
    // Por ahora, no cambiamos su estado `isCompleted` aquí.
    // Si quieres que el usuario las marque manualmente:
    // if (taskId) {
    //   setTasks(prevTasks => prevTasks.map(task =>
    //     task.id === taskId ? { ...task, isCompleted: true } : task
    //   ));
    // }
  };

  const isProviderConnected = (provider: string): boolean => {
    if (sessionStatus !== "authenticated" || !session) return false;
    switch (provider) {
      case "farcaster":
        return !!session?.fid;
      case "twitter":
        return !!session?.twitterHandle;
      default:
        return false;
    }
  };

  const getProviderHandle = (provider: string): string | null => {
    if (sessionStatus !== "authenticated" || !session) return null;
    switch (provider) {
      case "farcaster":
        return session?.fid ? `FID: ${session.fid}` : null;
      case "twitter":
        return session?.twitterHandle ? `@${session.twitterHandle}` : null;
      default:
        return null;
    }
  };

  const getTaskIcon = (id: string) => {
    switch (id) {
      case 'follow-twitter':
        return <Image src="/x.png" alt="X" width={20} height={20} className="inline-block mr-2" />;
      case 'follow-zora':
        return <Image src="/zora.png" alt="Zora" width={20} height={20} className="inline-block mr-2" />;
      case 'follow-farcaster':
        return <SiFarcaster className="inline-block mr-2 text-blue-200" />;
      case 'follow-tiktok':
        return <FaTiktok className="inline-block mr-2 text-blue-200" />;
      case 'follow-instagram':
        return <FaInstagram className="inline-block mr-2 text-blue-200" />;
      case 'join-telegram':
        return <FaTelegram className="inline-block mr-2 text-blue-200" />;
      default:
        return null;
    }
  };

  const renderTaskButton = (task: Task) => {
    if (task.socialNetwork === "a0x") {
      return (
        <div className="flex flex-col items-end space-y-1 text-right">
          {isLoadingTokenBalance && (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          )}
          {!isLoadingTokenBalance && (
            <>
              <span
                className={`text-sm font-medium ${
                  task.isCompleted
                    ? "text-green-400"
                    : balance !== null
                    ? "text-red-400"
                    : "text-gray-400"
                }`}
              >
                {balance !== null
                  ? `${Number(balance).toLocaleString()} / ${MIN_A0X_REQUIRED}`
                  : isConnected
                  ? "Loading..."
                  : "Wallet not connected"}{" "}
                A0X
              </span>
              {task.isCompleted && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {task.verificationError && (
                <span className="text-xs text-red-400">
                  {task.verificationError}
                </span>
              )}
            </>
          )}
        </div>
      );
    }

    if (task.needsAuth) {
      const connected = isProviderConnected(task.socialNetwork);
      const handle = getProviderHandle(task.socialNetwork);

      console.log("sessionStatus", session);

      console.log(
        connected,
        "connected",
        task.socialNetwork,
        "task.socialNetwork",
        handle,
        "handle"
      );

      if (!connected) {
        return (
          <div className="flex flex-col items-end space-y-1">
            <div className="flex flex-row items-center space-x-2">
              <Button
                onClick={() =>
                  handleSocialAuth(
                    task.socialNetwork as "farcaster" | "twitter"
                  )
                }
                className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1 text-white"
                disabled={sessionStatus === "loading" || isVerifyingAll}
              >
                {sessionStatus === "loading" ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Connect`
                )}
              </Button>
              {task.url && (
                <Button
                  onClick={() => handleExternalLink(task.url!)}
                  className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1 text-white"
                  title={`Ir a ${task.socialNetwork}`}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
            {task.verificationError && (
              <span className="text-xs text-red-400">
                {task.verificationError}
              </span>
            )}
          </div>
        );
      }

      // Conectado, mostrar estado de follow
      return (
        <div className="flex flex-col items-end space-y-1 text-right">
          {handle && <span className="text-xs text-gray-400">{handle}</span>}
          <div className="flex items-center space-x-2">
            {isVerifyingAll && !task.isCompleted ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : task.isCompleted ? (
              <div className="flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-400">Following</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-red-400">Not following</span>
                <Button
                  onClick={() => handleExternalLink(task.url!)}
                  className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                  title={`Open ${task.socialNetwork} to follow`}
                >
                  Follow <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}
          </div>
          {task.verificationError && (
            <span className="text-xs text-red-400">
              {task.verificationError}
            </span>
          )}
        </div>
      );
    }

    // Tareas que solo requieren un link externo (TikTok, Instagram, Telegram)
    return (
      <div className="flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleExternalLink(task.url!)}
            className="bg-gray-600 hover:bg-gray-700 text-sm px-3 py-1 text-white"
          >
            Open Link <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
          {task.isCompleted && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
        {task.verificationError && (
          <span className="text-xs text-red-400">{task.verificationError}</span>
        )}
      </div>
    );
  };

  const requiredTasks = tasks.filter((task) => task.isRequired);
  const optionalTasks = tasks.filter((task) => !task.isRequired);
  const completedRequiredTasks = requiredTasks.filter(
    (task) => task.isCompleted
  ).length;
  const completedOptionalTasks = optionalTasks.filter(
    (task) => task.isCompleted
  ).length;
  const allRequiredCompleted =
    isConnected &&
    sessionStatus === "authenticated" &&
    completedRequiredTasks === requiredTasks.length;

  useEffect(() => {
    setAsciiLinesToShow(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAsciiLinesToShow(i);
      if (i >= asciiLogoLines.length) clearInterval(interval);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#1752F0] text-white font-mono relative overflow-hidden">
      {/* Scanline effect */}
      <div className="scanline pointer-events-none absolute inset-0 z-10" />
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-2 py-8">
        <pre className="text-white text-xs sm:text-sm leading-none mb-6 select-none text-center drop-shadow-[0_0_2px_white] font-mono tracking-widest">
          {asciiLogoLines.slice(0, asciiLinesToShow).join("\n")}
        </pre>
        <div className="max-w-xl w-full space-y-8">
          <div className="text-center mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-widest text-white drop-shadow-[0_0_2px_white]">
              MOONXBT AIRDROP
            </h1>
            <p className="text-blue-100 text-sm sm:text-base tracking-wide">
              Complete tasks to earn your airdrop!
            </p>
          </div>
          {isConnected && balance !== null && (
            <div className="terminal-border bg-[#1752F0] p-4 my-2 relative text-center">
              <div className="font-mono text-white text-lg">
                <span className="text-blue-200">Your $A0X Balance:</span>
                <span className="ml-2 text-white font-bold">{Number(balance).toLocaleString()} A0X</span>
              </div>
            </div>
          )}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold mb-2 text-white border-b border-white/30 pb-1 tracking-widest">
                REQUIRED TASKS
              </h2>
              <div className="space-y-3">
                {requiredTasks.map((task) => (
                  <div key={task.id} className="terminal-border bg-[#1752F0] p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {task.isCompleted ? (
                        <span className="text-green-300">[✓]</span>
                      ) : (
                        <span className="text-white">[ ]</span>
                      )}
                      <div>
                        <span className="text-blue-100 font-bold flex items-center">{getTaskIcon(task.id)}{task.title}</span>
                        <div className="text-xs text-blue-50">{task.description}</div>
                      </div>
                    </div>
                    {renderTaskButton(task)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-2 text-white border-b border-white/30 pb-1 tracking-widest">
                BONUS TASKS
              </h2>
              <div className="space-y-3">
                {optionalTasks.map((task) => (
                  <div key={task.id} className="terminal-border bg-[#1752F0] p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {task.isCompleted ? (
                        <span className="text-green-300">[✓]</span>
                      ) : (
                        <span className="text-white">[ ]</span>
                      )}
                      <div>
                        <span className="text-blue-100 font-bold flex items-center">{getTaskIcon(task.id)}{task.title}</span>
                        <div className="text-xs text-blue-50">{task.description}</div>
                      </div>
                    </div>
                    {renderTaskButton(task)}
                  </div>
                ))}
              </div>
            </div>
            <div className="terminal-border bg-[#1752F0] p-4 text-center mt-4">
              <pre className="text-white text-xs mb-2 select-none">
                [{"=".repeat(completedRequiredTasks)}{" ".repeat(requiredTasks.length-completedRequiredTasks)}] {completedRequiredTasks}/{requiredTasks.length} Required
                [{"=".repeat(completedOptionalTasks)}{" ".repeat(optionalTasks.length-completedOptionalTasks)}] {completedOptionalTasks}/{optionalTasks.length} Bonus
              </pre>
              <span className="bios-cursor" />
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        .terminal-border {
          border: 2px solid #fff;
          border-radius: 0;
          box-shadow: 0 0 0 2px #1752F0, 0 0 8px #fff2;
        }
        .scanline {
          background: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.04) 0px,
            rgba(255,255,255,0.04) 1px,
            transparent 1px,
            transparent 4px
          );
        }
        .bios-cursor {
          display: inline-block;
          width: 8px;
          height: 1em;
          background: #fff;
          animation: blink 1s steps(1) infinite;
          vertical-align: bottom;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </main>
  );
}
