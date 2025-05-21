"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/shadcn/sheet";
import { parseEther, formatEther } from 'viem';
import { useContractRead, useContractWrite } from 'wagmi';

import { A0X_ABI } from '@/constants/abi';
import { A0X_CONTRACT_ADDRESS, AUCTION_CONTRACT_ADDRESS, AUCTION_ABI } from '@/constants/contracts';
import { sdk } from '@farcaster/frame-sdk';

const A0X_CONTRACT = '0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7';

interface VideoAuctionSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoAuctionSheet({ isOpen, onClose }: VideoAuctionSheetProps) {
  const [timeLeft, setTimeLeft] = useState("00:25:23");
  const [bidAmount, setBidAmount] = useState<string>('');
  const [url, setUrl] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [shouldShowSheet, setShouldShowSheet] = useState(isOpen);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Initialize Farcaster wallet connection
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Wait for SDK to be ready
        await sdk.actions.ready();
        
        const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          setIsWalletConnected(true);
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkWalletConnection();
  }, []);

  // Sync shouldShowSheet with isOpen prop
  useEffect(() => {
    setShouldShowSheet(isOpen);
  }, [isOpen]);

  const { data: allowance } = useContractRead({
    address: A0X_CONTRACT_ADDRESS,
    abi: A0X_ABI,
    functionName: 'allowance',
    args: [walletAddress as `0x${string}` ?? '0x0', AUCTION_CONTRACT_ADDRESS],
    query: {
      enabled: Boolean(walletAddress),
    },
  });

  const { writeContract: approve } = useContractWrite();

  const { writeContract: placeBid } = useContractWrite();

  const isBaseNetwork = walletAddress && walletAddress.startsWith('0x') && walletAddress.length === 42;
  const currentBid = "52M $A0X";
  const currentBidUSD = "$169.78";

  const handleBid = async () => {
    if (!walletAddress || !bidAmount) return;

    try {
      const bidAmountWei = parseEther(bidAmount);
      
      if (allowance && allowance < bidAmountWei) {
        setIsApproving(true);
        await approve({
          address: A0X_CONTRACT_ADDRESS as `0x${string}`,
          abi: A0X_ABI,
          functionName: 'approve',
          args: [AUCTION_CONTRACT_ADDRESS, bidAmountWei],
        });
        setIsApproving(false);
      }

      setIsBidding(true);
      await placeBid({
        address: AUCTION_CONTRACT_ADDRESS as `0x${string}`,
        abi: AUCTION_ABI,
        functionName: 'placeBid',
        args: [bidAmountWei],
      });
      setIsBidding(false);
      
      setBidAmount('');
    } catch (error) {
      console.error('Error placing bid:', error);
      setIsApproving(false);
      setIsBidding(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      const accounts = await sdk.wallet.ethProvider.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setIsWalletConnected(true);
        setWalletAddress(accounts[0]);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsWalletConnected(false);
      setWalletAddress(null);
      setBidAmount('');
      setUrl('');
      setAdditionalInfo('');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const renderWalletButton = () => {
    if (!isWalletConnected) {
      return (
        <button
          onClick={handleConnectWallet}
          type="button"
          className="w-full py-2.5 px-4 bg-[#1a237e]/40 hover:bg-[#1a237e]/60 text-white font-mono text-sm rounded-lg border border-white/10 transition-all duration-300"
        >
          Connect Wallet
        </button>
      );
    }

    return (
      <div className="bg-[#1a237e]/20 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="font-mono text-sm text-white/80">
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-white/50 hover:text-white/80 transition-colors flex items-center gap-2"
        >
          <span className="font-mono text-sm">Disconnect</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <Sheet 
      open={shouldShowSheet} 
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
        }
        setShouldShowSheet(open);
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-[900px] bg-[#1752F0] border-none p-6 overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'linear-gradient(rgba(255,255,255,0.03) 50%, transparent 50%)',
            backgroundSize: '100% 4px',
            animation: 'scan 8s linear infinite'
          }}
        />
        
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-mono font-bold text-white tracking-wider text-center">AUCTION #50</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Video Section */}
            <div className="bg-black/20 rounded-lg p-4 aspect-square flex items-center justify-center overflow-hidden border border-white/10">
              <video
                src="/assets/moonxbtauction.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover rounded"
              />
            </div>

            {/* Today's Winner Section */}
            <div className="bg-black/20 rounded-lg p-4 border border-white/10">
              <h3 className="text-white text-lg font-mono font-semibold mb-4 tracking-wider">🏆 TODAY'S WINNER 🏆</h3>
              <div className="flex justify-between items-center">
                <div className="flex space-x-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full border border-green-500/30"></div>
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-full border border-yellow-500/30"></div>
                  <div className="w-8 h-8 bg-red-500/20 rounded-full border border-red-500/30"></div>
                </div>
                <span className="text-white/60 font-mono text-sm tracking-wider">contentment.fun</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Bid Info Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <div>
                  <h3 className="text-white/60 text-sm font-mono tracking-wider">CURRENT BID</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white text-3xl font-mono font-bold">{currentBid}</span>
                    <span className="text-white/60 font-mono">({currentBidUSD})</span>
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-white/60 text-sm font-mono tracking-wider">TIME LEFT</h3>
                  <span className="text-white text-3xl font-mono font-bold">{timeLeft}</span>
                </div>
              </div>

              {/* Wallet Section */}
              <div className="space-y-4">
                {renderWalletButton()}

                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="text-white/60 font-mono">$A0X</span>
                  </div>
                  <input
                    type="text"
                    placeholder="57.2M or more"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full pl-16 pr-3 py-2.5 bg-[#1a237e]/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-sm"
                  />
                </div>

                <input
                  type="text"
                  placeholder="URL (Optional)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#1a237e]/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-sm"
                />

                <div className="relative">
                  <textarea
                    placeholder="ADDITIONAL INFORMATION FOR MOONXBT (OPTIONAL)"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    maxLength={280}
                    className="w-full px-3 py-2.5 bg-[#1a237e]/20 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono text-sm h-24 resize-none"
                  />
                  <div className="absolute bottom-2 right-2 text-white/30 text-xs font-mono">
                    {additionalInfo.length}/280
                  </div>
                </div>

                <button
                  onClick={handleBid}
                  disabled={isApproving || isBidding || !isWalletConnected}
                  className={`w-full py-3 rounded-lg font-bold text-sm tracking-wider transition-all duration-300 ${
                    isApproving || isBidding || !isWalletConnected
                      ? 'bg-[#1a237e]/20 text-white/50 cursor-not-allowed'
                      : 'bg-[#1a237e]/40 hover:bg-[#1a237e]/60 text-white'
                  } border border-white/10 font-mono`}
                >
                  {isApproving ? 'APPROVING...' : isBidding ? 'PLACING BID...' : 'PLACE BID'}
                </button>
              </div>
            </div>

            {/* Bid Info Footer */}
            <div className="bg-[#1a237e]/20 rounded-lg p-3 space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60 font-mono">CURRENT BID WEBSITE:</span>
                <a 
                  href="https://zora.co/@ledgerville" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-white hover:text-white/80 transition-colors font-mono"
                >
                  zora.co/@ledgerville
                </a>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60 font-mono">HIGHEST BIDDER:</span>
                <span className="text-white font-mono">@thecryptos.eth</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes scan {
            from { transform: translateY(0); }
            to { transform: translateY(4px); }
          }

          /* Custom scrollbar for the modal */
          .overflow-y-auto::-webkit-scrollbar {
            width: 6px;
          }

          .overflow-y-auto::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }

          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
          }

          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </SheetContent>
    </Sheet>
  );
} 