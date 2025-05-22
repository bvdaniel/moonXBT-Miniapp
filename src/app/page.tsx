"use client";
import { Button } from "@/components/ui/Button"; // Asegúrate que esta ruta es correcta
import sdk from "@farcaster/frame-sdk";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Instagram,
  Loader2,
  MessageCircle,
  Play,
  Send,
  Twitter,
  Wallet,
  Coins,
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";

// A0X Token Contract ABI
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
    | "a0x";
  isRequired: boolean;
  isCompleted: boolean;
  needsAuth: boolean;
  url?: string;
  icon: React.ReactNode;
  targetUsername?: string;
  verificationError?: string | null; // Para mostrar errores específicos de la tarea
}

interface VerificationResult {
  taskId: string;
  isCompleted: boolean;
  error?: string;
}

export default function UpdatedAirdropComponent() {
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount(); // connector puede ser útil
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false); // Renombrado para claridad
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

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
        icon: <Twitter className="w-5 h-5 text-blue-400" />,
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
        icon: <Instagram className="w-5 h-5 text-pink-500" />,
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
                className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1"
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
                  className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1"
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
            className="bg-gray-600 hover:bg-gray-700 text-sm px-3 py-1"
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
  const completedRequiredTasksCount = requiredTasks.filter(
    (task) => task.isCompleted
  ).length;
  const allRequiredCompleted =
    isConnected &&
    sessionStatus === "authenticated" &&
    completedRequiredTasksCount === requiredTasks.length;

  const handleClaimAirdrop = async () => {
    if (!allRequiredCompleted) {
      setClaimMessage("Please complete all required tasks first.");
      return;
    }
    setIsClaiming(true);
    setClaimMessage(null);
    // Aquí iría la lógica para llamar a tu backend y registrar el claim
    // Por ejemplo:
    // try {
    //   const response = await fetch('/api/claim-airdrop', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ walletAddress: address })
    //   });
    //   const data = await response.json();
    //   if (response.ok) {
    //     setClaimMessage(`Airdrop claimed successfully! Transaction: ${data.txHash}`);
    //   } else {
    //     setClaimMessage(`Error: ${data.message || 'Failed to claim airdrop.'}`);
    //   }
    // } catch (error) {
    //   setClaimMessage("An error occurred while claiming. Please try again.");
    // } finally {
    //   setIsClaiming(false);
    // }

    // Placeholder:
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setClaimMessage(
      "Airdrop claim initiated! (This is a demo, no actual claim processed)"
    );
    setIsClaiming(false);
  };

  // Botón para refrescar verificaciones
  const refreshButton = (
    <Button
      onClick={verifyAllTasks}
      disabled={
        isVerifyingAll ||
        !isConnected ||
        sessionStatus !== "authenticated" ||
        balance === null
      }
      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700"
    >
      {isVerifyingAll ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Tasks...
        </>
      ) : (
        "Refresh All Task Verifications"
      )}
    </Button>
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-lg w-full space-y-6 bg-gray-800/50 backdrop-blur-md p-6 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
            MoonXBT Airdrop
          </h1>
          <p className="text-gray-300">
            Complete tasks to become eligible for the airdrop!
          </p>
        </div>

        {/* Wallet & Session Status */}
        <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet:
            </span>
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-mono ${
                  isConnected ? "text-green-400" : "text-red-400"
                }`}
              >
                {isConnected && address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : "Not Connected"}
              </span>
              {isConnected && address && (
                <Button
                  onClick={() =>
                    window.open(
                      `https://basescan.org/address/${address}`,
                      "_blank"
                    )
                  }
                  className="bg-gray-600 hover:bg-gray-700 text-xs px-2 py-1"
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {isConnected && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300 flex items-center">
                <Coins className="w-4 h-4 mr-2" />
                A0X Balance:
              </span>
              {isLoadingTokenBalance ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <span
                  className={`text-sm font-semibold ${
                    balance !== null && Number(balance) >= MIN_A0X_REQUIRED
                      ? "text-yellow-400"
                      : balance !== null
                      ? "text-orange-400"
                      : "text-gray-500"
                  }`}
                >
                  {balance !== null
                    ? `${Number(balance).toLocaleString()} A0X`
                    : tokenBalanceError
                    ? "Error"
                    : "Loading..."}
                </span>
              )}
            </div>
          )}

          {sessionStatus === "authenticated" && session && (
            <div className="border-t border-gray-600 pt-3 mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
              {session.fid && (
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400 flex items-center">
                    <MessageCircle size={14} className="mr-1" /> Farcaster ✓
                  </span>
                  <Button
                    onClick={() =>
                      window.open(`https://warpcast.com/ai420z`, "_blank")
                    }
                    className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {session.twitterHandle && (
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400 flex items-center">
                    <Twitter size={14} className="mr-1" /> X (Twitter) ✓
                  </span>
                  <Button
                    onClick={() =>
                      window.open(`https://x.com/moonXBT_ai`, "_blank")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {sessionStatus === "authenticated" && (
            <Button
              onClick={() => signOut({ callbackUrl: window.location.pathname })}
              className="w-full mt-2 bg-red-700/70 hover:bg-red-600 text-xs py-1"
            >
              Sign Out
            </Button>
          )}
        </div>

        {/* Task Sections */}
        {["Required", "Optional"].map((type) => {
          const taskList = type === "Required" ? requiredTasks : optionalTasks;
          if (taskList.length === 0) return null;
          return (
            <div key={type} className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2 mb-3">
                {type} Tasks
              </h2>
              {taskList.map((task) => (
                <div
                  key={task.id}
                  className={`bg-gray-700/60 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0
                              ${
                                task.isCompleted
                                  ? "border-l-4 border-green-500"
                                  : task.verificationError
                                  ? "border-l-4 border-red-500"
                                  : "border-l-4 border-gray-600"
                              }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="mt-1">{task.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-50">{task.title}</h3>
                      <p className="text-xs text-gray-400">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  <div className="sm:min-w-[180px] sm:text-right">
                    {" "}
                    {/* Ensure button area has enough space */}
                    {renderTaskButton(task)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Refresh Button - solo mostrar si hay tareas que necesiten auth y sesión o wallet */}
        {(tasks.some((t) => t.needsAuth) ||
          tasks.some((t) => t.id === "hold-a0x")) &&
          refreshButton}

        {/* Eligibility & Claim */}
        <div
          className={`rounded-lg p-4 text-center border-2 ${
            allRequiredCompleted
              ? "bg-green-900/30 border-green-500"
              : isConnected && sessionStatus === "authenticated"
              ? "bg-yellow-900/30 border-yellow-500"
              : "bg-gray-700/30 border-gray-500"
          }`}
        >
          <h2 className="text-lg font-bold mb-2">
            {allRequiredCompleted
              ? "🎉 You are Eligible for the Airdrop!"
              : isConnected && sessionStatus === "authenticated"
              ? "Almost there!"
              : "Connect and Sign In to Check Eligibility"}
          </h2>
          <p className="text-sm text-gray-300 mb-3">
            {isConnected && sessionStatus === "authenticated"
              ? `${completedRequiredTasksCount} / ${requiredTasks.length} required tasks completed.`
              : "Please connect your wallet and sign in with your social accounts."}
          </p>

          {allRequiredCompleted && (
            <Button
              onClick={handleClaimAirdrop}
              disabled={isClaiming}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Your Airdrop Now!"
              )}
            </Button>
          )}
          {claimMessage && (
            <p
              className={`mt-3 text-sm ${
                claimMessage.includes("Error") ||
                claimMessage.includes("Failed")
                  ? "text-red-400"
                  : "text-green-400"
              }`}
            >
              {claimMessage}
            </p>
          )}
          {!allRequiredCompleted &&
            isConnected &&
            sessionStatus === "authenticated" &&
            requiredTasks.length > 0 && (
              <p className="text-xs text-yellow-300 mt-2">
                Complete all required tasks above to enable the claim button.
              </p>
            )}
        </div>
      </div>
    </main>
  );
}
