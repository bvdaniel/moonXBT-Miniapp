import { Metadata } from "next";
import AirdropClient from "@/components/AirdropClient";

import { UserContext } from "@farcaster/frame-core/dist/context";
import Image from "next/image";
import { FaInstagram, FaTiktok, FaTelegram } from "react-icons/fa";
import { SiFarcaster } from "react-icons/si";
import Link from "next/link";
import LeaderboardTab from "./leaderboard/LeaderboardTab";

export const revalidate = 300;

async function getUserInfo(fid: number) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/a0x-framework/airdrop/participant-exists?fid=${fid}`,
      {
        next: { revalidate: 60 },
      }
    );
    const data = await response.json();
    return data || null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}
export async function generateMetadata({
  searchParams, // This `searchParams` prop itself needs to be awaited
}: {
  // The type signature describes the shape of the *resolved* searchParams object
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  // Await the searchParams object to access its properties
  const resolvedSearchParams = await searchParams;

  let rawFid = resolvedSearchParams.sharedFid;
  if (Array.isArray(rawFid)) {
    rawFid = rawFid[0]; // Use the first value if it's an array
  }

  const sharedFid = rawFid ? parseInt(rawFid, 10) : null;
  let initialUserInfo = null;
  let initialPoints = 100;
  let sharedImage = null;

  if (sharedFid) {
    initialUserInfo = await getUserInfo(sharedFid); // This remains async
    initialPoints = initialUserInfo?.points || 100;
    sharedImage = initialUserInfo?.farcasterPfpUrl || null;
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const frame = {
    version: "next",
    imageUrl: `${appUrl}/api/og?points=${initialPoints}&viewerFid=${sharedFid}&pfpUrl=${encodeURIComponent(
      sharedImage
    )}`,
    button: {
      title: "Join MoonXBT",
      action: {
        type: "launch_frame",
        name: "MoonXBT",
        url: appUrl,
        splashImageUrl: `${appUrl}/opengraph-image.png`,
        splashBackgroundColor: "#000000",
      },
    },
  };

  return {
    title: "MoonXBT - Airdrop Points",
    openGraph: {
      title: "MoonXBT",
      description: "Join MoonXBT and earn airdrop points",
      images: [
        {
          url: `${appUrl}/api/og?points=${initialPoints}&viewerFid=${sharedFid}&pfpUrl=${encodeURIComponent(
            sharedImage
          )}`,
          width: 1500,
          height: 1000,
        },
      ],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}
export default async function Page({
  searchParams, // This `searchParams` prop itself needs to be awaited
}: {
  // The type signature describes the shape of the *resolved* searchParams object
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Await the searchParams object to access its properties
  const resolvedSearchParams = await searchParams;

  let rawFid = resolvedSearchParams.sharedFid;
  if (Array.isArray(rawFid)) {
    rawFid = rawFid[0]; // Use the first value if it's an array
  }

  return <AirdropClient />;
}
