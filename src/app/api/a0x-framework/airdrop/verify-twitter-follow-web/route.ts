import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface VerifyTwitterFollowWebBody {
  id: string;
  twitterUsername: string;
  targetTwitterUsername?: string;
  walletAddress: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

export async function POST(request: NextRequest) {
  try {
    const body: VerifyTwitterFollowWebBody = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, twitterUsername, targetTwitterUsername, walletAddress } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Require a valid id (string)" },
        { status: 400 }
      );
    }
    if (!twitterUsername || typeof twitterUsername !== "string") {
      return NextResponse.json(
        { error: "Require a valid twitterUsername (string)" },
        { status: 400 }
      );
    }

    const target =
      targetTwitterUsername || process.env.AIRDROP_TARGET_TWITTER || "";
    if (!target || typeof target !== "string") {
      return NextResponse.json(
        {
          error:
            "Require a valid targetTwitterUsername (string) or AIRDROP_TARGET_TWITTER env",
        },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Require a valid walletAddress (string)" },
        { status: 400 }
      );
    }

    const payload = {
      id,
      twitterUsername,
      targetTwitterUsername: target,
      walletAddress,
    };

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/moonxbt/airdrop/verify-twitter-follow-web`,
      payload
    );

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to verify Twitter follow", details: response.data },
        { status: response.status }
      );
    }

    const isActuallyFollowingTwitter = response.data.isFollowing;

    return NextResponse.json(
      {
        message: "Twitter follow verification processed (web)",
        isFollowing: isActuallyFollowingTwitter,
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying Twitter follow (web):", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to verify Twitter follow (web)", details: errorMessage },
      { status: 500 }
    );
  }
}
