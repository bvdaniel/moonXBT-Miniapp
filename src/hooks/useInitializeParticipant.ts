import { useEffect } from "react";
import { airdropApi } from "@/services/airdropApi";

interface UseInitializeParticipantParams {
  isInMiniApp: boolean | null;
  ready: boolean;
  authenticated: boolean;
  wallets: { address?: string }[];
  sharedFid?: number | null;
}

export function useInitializeParticipant({
  isInMiniApp,
  ready,
  authenticated,
  wallets,
  sharedFid,
}: UseInitializeParticipantParams) {
  useEffect(() => {
    const initializeUserWithoutMiniApp = async () => {
      const wallet = wallets[0];
      if (wallet) {
        try {
          console.warn(
            "[Init] Initializing web user",
            JSON.stringify({ wallet: wallet.address, sharedFid }, null, 2)
          );
          await airdropApi.initializeParticipant({
            fid: -1,
            username: `web-user-${wallet.address?.slice(0, 8)}`,
            displayName: `Web User ${wallet.address?.slice(0, 6)}...`,
            pfpUrl:
              "https://api.dicebear.com/7.x/identicon/svg?seed=" +
              wallet.address,
            isFollowingFarcaster: false,
            walletAddress: wallet.address || "",
            referredByFid: sharedFid || null,
          });
          console.log("Web user initialized successfully");
        } catch (error) {
          console.error("Error initializing web user:", error);
        }
      }
    };

    if (!isInMiniApp && ready && authenticated && wallets.length > 0) {
      console.warn(
        "[Init] Conditions met, starting initializeUserWithoutMiniApp",
        JSON.stringify(
          { ready, authenticated, wallets: wallets.length },
          null,
          2
        )
      );
      void initializeUserWithoutMiniApp();
    }
  }, [ready, authenticated, wallets, isInMiniApp, sharedFid]);
}
