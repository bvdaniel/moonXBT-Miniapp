import { Metadata } from "next";
import AirdropClient from "@/components/AirdropClient";

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
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
  const params = await Promise.resolve(searchParams);
  let rawFid = params.sharedFid;
  if (Array.isArray(rawFid)) {
    rawFid = rawFid[0];
  }

  const sharedFid = rawFid ? parseInt(rawFid, 10) : null;
  let initialUserInfo = null;
  let initialPoints = 100;
  let sharedImage = null;

  if (sharedFid) {
    initialUserInfo = await getUserInfo(sharedFid);
    initialPoints = initialUserInfo?.points || 100;
    sharedImage = initialUserInfo?.farcasterPfpUrl || null;
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const frame = {
    version: "next",
    imageUrl: `${appUrl}/api/og?points=${initialPoints}&viewerFid=${sharedFid}&pfpUrl=${encodeURIComponent(
      sharedImage || "https://i.ibb.co/QvFx17r6/logo.png"
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
            sharedImage || "https://i.ibb.co/QvFx17r6/logo.png"
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
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = await Promise.resolve(searchParams);
  let rawFid = params.sharedFid;
  if (Array.isArray(rawFid)) {
    rawFid = rawFid[0];
  }

  const sharedFid = rawFid ? parseInt(rawFid, 10) : null;
  let initialUserInfo = null;
  let initialPoints = 100;

  if (sharedFid) {
    initialUserInfo = await getUserInfo(sharedFid);
    initialPoints = initialUserInfo?.points || 100;
  }

  return <AirdropClient />;
}
