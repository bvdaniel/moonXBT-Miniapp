import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/frame-sdk";
import { getUserNotificationDetails } from "~/lib/kv";
import { kv } from './kv';
import { neynar } from './neynar';

const appUrl = process.env.NEXT_PUBLIC_URL || "";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendFrameNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<SendFrameNotificationResult> {
  const notificationDetails = await getUserNotificationDetails(fid);
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: appUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();

  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    if (responseBody.success === false) {
      // Malformed response
      return { state: "error", error: responseBody.error.errors };
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      // Rate limited
      return { state: "rate_limit" };
    }

    return { state: "success" };
  } else {
    // Error response
    return { state: "error", error: responseJson };
  }
}

export type NotificationToken = {
  token: string;
  url: string;
};

export async function saveNotificationToken(fid: number, token: NotificationToken) {
  await kv.set(`notification_token:${fid}`, token);
}

export async function getNotificationToken(fid: number): Promise<NotificationToken | null> {
  return await kv.get(`notification_token:${fid}`);
}

export async function removeNotificationToken(fid: number) {
  await kv.del(`notification_token:${fid}`);
}

export async function sendNotification(fid: number, notification: {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
}) {
  const token = await getNotificationToken(fid);
  if (!token) return null;

  try {
    const response = await fetch(token.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...notification,
        tokens: [token.token],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}
