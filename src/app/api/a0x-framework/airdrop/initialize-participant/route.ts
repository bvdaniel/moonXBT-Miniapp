import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
interface InitializeParticipantBody {
  fid: number;
  username: string;
  pfpUrl: string;
  walletAddress: string;
  displayName?: string;
  isFollowingFarcaster?: boolean;
  twitterAccount?: { username: string; platform: string }; // Opcional
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to initialize or update an airdrop participant.
 * Receives Farcaster data and potentially wallet and Twitter info.
 */
export async function POST(request: NextRequest) {
  try {
    const body: InitializeParticipantBody = await request.json();

    // Validate required fields
    if (!body.fid || !body.username || !body.walletAddress || !body.pfpUrl) {
      return NextResponse.json(
        { error: "fid, username, walletAddress and pfpUrl are required" },
        { status: 400 }
      );
    }

    console.log("Initializing participant:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/initialize-participant`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to initialize participant", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "Participant initialized/updated successfully",
        data: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error initializing participant:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to initialize participant", details: errorMessage },
      { status: 500 }
    );
  }
}
