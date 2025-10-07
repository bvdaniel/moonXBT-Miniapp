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

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  console.log("Generating metadata");
  console.log(searchParams);
  console.log("Generating metadata");

  const params = await searchParams;
  let rawFid = params.sharedFid;
  if (Array.isArray(rawFid)) {
    rawFid = rawFid[0];
  }

  const pointsParam = params.points || "10";
  let points = pointsParam ? parseInt(pointsParam as string, 10) : 10;

  // Ensure points is a valid number, fallback to 10 if NaN
  if (isNaN(points)) {
    points = 10;
  }

  const sharedFid = rawFid ? parseInt(rawFid, 10) : null;
  let initialUserInfo = null;
  let sharedImage = null;

  if (sharedFid) {
    initialUserInfo = await getUserInfo(sharedFid);
    sharedImage = initialUserInfo?.farcasterPfpUrl || null;
    points = initialUserInfo?.points || points;
  }

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  const frame = {
    version: "next",
    imageUrl: `${appUrl}/api/og?points=${points}&viewerFid=${sharedFid}&pfpUrl=${encodeURIComponent(
      sharedImage || "https://i.ibb.co/QvFx17r6/logo.png"
    )}`,
    button: {
      title: "Join MoonXBT",
      action: {
        type: "launch_frame",
        name: "MoonXBT",
        url: `${appUrl}/?sharedFid=${sharedFid}`,
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
          url: `${appUrl}/api/og?points=${points}&viewerFid=${sharedFid}&pfpUrl=${encodeURIComponent(
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
  searchParams: SearchParams;
}) {
  const params = await searchParams;
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

  return <AirdropClient sharedFid={sharedFid} />;
}
