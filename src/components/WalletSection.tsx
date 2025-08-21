import { Button } from "@/components/ui/Button";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";

interface WalletSectionProps {
  shown: boolean; // only shown when not in miniapp
  ready: boolean;
  authenticated: boolean;
  wallets: { address?: string }[];
  disableLogin: boolean;
  onLogin: () => void;
  onSignout: () => void;
}

export default function WalletSection({
  shown,
  ready,
  authenticated,
  wallets,
  disableLogin,
  onLogin,
  onSignout,
}: WalletSectionProps) {
  if (!shown) return null;
  return (
    <div className="terminal-border bg-[#1752F0]/80 p-1.5 sm:p-3 text-center w-full">
      {!ready ? (
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="w-5 h-5 text-blue-200 animate-spin" />
          <span className="text-blue-200 text-sm">Loading...</span>
        </div>
      ) : !authenticated ? (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-200" />
            <span className="text-blue-200 text-sm font-bold tracking-wide">
              WALLET CONNECTION
            </span>
          </div>
          <p className="text-blue-100 text-xs mb-3">
            Connect your wallet to participate in the airdrop
          </p>
          <Button
            onClick={onLogin}
            disabled={disableLogin}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 w-full rounded-none tracking-wider"
          >
            <Wallet className="w-4 h-4 mr-2" />
            CONNECT WALLET
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm font-bold tracking-wide">
              WALLET CONNECTED
            </span>
          </div>
          <div className="flex items-center justify-around w-full">
            {wallets[0]?.address && (
              <p className="text-blue-100 text-sm">
                {wallets[0].address.slice(0, 6)}...
                {wallets[0].address.slice(-4)}
              </p>
            )}
            <div className="flex space-x-2">
              <Button
                onClick={onSignout}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1 text-xs rounded-none"
              >
                DISCONNECT
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
