import { useEffect, useState } from "react";
import sdk from "@farcaster/frame-sdk";

export function useMiniAppDetection(): boolean | null {
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    const detectMiniApp = async () => {
      try {
        const isMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(isMiniApp);
        console.log("Is in Mini App:", isMiniApp);
      } catch (error) {
        console.error("Error detecting Mini App:", error);
        setIsInMiniApp(false);
      }
    };
    void detectMiniApp();
  }, []);

  return isInMiniApp;
}
