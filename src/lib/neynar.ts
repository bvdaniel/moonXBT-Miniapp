import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

if (!process.env.NEYNAR_API_KEY) {
  throw new Error('Missing Neynar API key');
}

const config = new Configuration({ apiKey: process.env.NEYNAR_API_KEY });
export const neynar = new NeynarAPIClient(config);

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendNeynarFrameNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<SendFrameNotificationResult> {
  try {
    const targetFids = [fid];
    const notification = {
      title,
      body,
      target_url: process.env.NEXT_PUBLIC_URL!,
    };

    const result = await neynar.publishFrameNotifications({ 
      targetFids, 
      notification 
    });

    if (result.notification_deliveries.length > 0) {
      return { state: "success" };
    } else if (result.notification_deliveries.length === 0) {
      return { state: "no_token" };
    } else {
      return { state: "error", error: result || "Unknown error" };
    }
  } catch (error) {
    return { state: "error", error };
  }
} 