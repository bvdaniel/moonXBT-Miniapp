import { Button } from "@/components/ui/Button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Task } from "@/hooks/useAirdropTasks";
import { MIN_A0X_REQUIRED } from "@/constants/tasks";
import sdk from "@farcaster/frame-sdk";

interface A0XTaskButtonProps {
  task: Task;
  balance: string | null;
  isLoadingTokenBalance: boolean;
  isConnected: boolean;
  userFid?: number;
  address?: string;
  isInMiniApp?: boolean | null;
}

const parseTextMillion = (amount: number) => {
  return `${Math.floor(amount / 1_000_000)}M`;
};

// MIN_A0X_REQUIRED imported from constants
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const A0X_TOKEN_ADDRESS = "0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7";

// Uniswap URL for external browser redirect
const UNISWAP_SWAP_URL =
  "https://app.uniswap.org/swap?exactField=input&outputCurrency=0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7&chain=base&theme=dark";

export default function A0XTaskButton({
  task,
  balance,
  isLoadingTokenBalance,
  isConnected,
  userFid,
  address,
  isInMiniApp,
}: A0XTaskButtonProps) {
  const handleBuyA0X = async () => {
    try {
      // Check if we're in a miniapp environment
      if (isInMiniApp) {
        // Use SDK for in-app swap
        console.log("Using SDK swap (Mini App environment)");
        const result = await sdk.actions.swapToken({
          sellToken: `eip155:8453/erc20:${USDC_ADDRESS}`,
          buyToken: `eip155:8453/erc20:${A0X_TOKEN_ADDRESS}`,
          sellAmount: "10000000", // 10 USDC
        });

        if (result.success && userFid) {
          console.log("Swap successful:", result.swap.transactions);

          try {
            const updateResponse = await fetch(
              "/api/a0x-framework/airdrop/update-balance",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  farcasterFid: userFid,
                  walletAddress: address,
                  transactions: result.swap.transactions,
                  timestamp: new Date().toISOString(),
                  currentBalance: balance,
                }),
              }
            );

            if (!updateResponse.ok) {
              console.error(
                "Error updating balance in backend:",
                await updateResponse.json()
              );
            }
          } catch (updateError) {
            console.error(
              "Error calling update-balance endpoint:",
              updateError
            );
          }
        } else {
          console.error("Swap failed:", result);
        }
      } else {
        // Redirect to Uniswap for external browser
        console.log("Redirecting to Uniswap (Browser environment)");
        if (!isInMiniApp) {
          // We're definitely in a browser, use window.open
          window.open(UNISWAP_SWAP_URL, "_blank");
        } else {
          // We're unsure of the environment, try SDK first
          try {
            await sdk.actions.openUrl(UNISWAP_SWAP_URL);
          } catch (error) {
            console.error(
              "SDK openUrl failed, falling back to window.open:",
              error
            );
            window.open(UNISWAP_SWAP_URL, "_blank");
          }
        }
      }
    } catch (error) {
      console.error("Error in handleBuyA0X:", error);
      // Fallback: try to open Uniswap in any case
      try {
        window.open(UNISWAP_SWAP_URL, "_blank");
      } catch (fallbackError) {
        console.error("Even fallback failed:", fallbackError);
      }
    }
  };

  return (
    <div className="flex flex-col items-end space-y-1 text-right">
      {isLoadingTokenBalance && (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
      )}
      {!isLoadingTokenBalance && (
        <>
          <div className="flex items-center space-x-2">
            <span
              className={`text-sm font-medium ${
                task.isCompleted
                  ? "text-green-400"
                  : balance !== null
                  ? "text-red-300"
                  : "text-gray-400"
              }`}
            >
              {balance !== null
                ? `${parseTextMillion(Number(balance))} / ${parseTextMillion(
                    MIN_A0X_REQUIRED
                  )} A0X`
                : isConnected
                ? "Loading..."
                : "Wallet not connected"}{" "}
            </span>
            {task.isCompleted && (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            <Button
              onClick={handleBuyA0X}
              className="bg-green-600 hover:bg-green-700 text-xs rounded-none h-6 p-0 px-1 text-white"
              disabled={!isConnected}
              title={
                isInMiniApp
                  ? "Swap using built-in functionality"
                  : "Open Uniswap to buy A0X tokens"
              }
            >
              Buy A0X
            </Button>
          </div>
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
