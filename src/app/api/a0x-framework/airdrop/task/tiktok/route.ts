import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface TikTokTaskBody {
  farcasterFid: number;
  tiktokUsername: string;
  targetTiktokUsername: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to register a user's intent to complete the TikTok follow task.
 * No automatic verification is performed by this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body: TikTokTaskBody = await request.json();

    if (!body.farcasterFid) {
      return NextResponse.json(
        { error: "farcasterFid is required" },
        { status: 400 }
      );
    }

    if (!body.tiktokUsername) {
      return NextResponse.json(
        { error: "tiktokUsername is required" },
        { status: 400 }
      );
    }

    if (!body.targetTiktokUsername) {
      return NextResponse.json(
        { error: "targetTiktokUsername is required" },
        { status: 400 }
      );
    }

    console.log("Registering TikTok task intent:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/task/tiktok`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to register TikTok task", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "TikTok task intent registered successfully.",
        fid: body.farcasterFid,
        taskMarkedCompleted: false,
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error registering TikTok task:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to register TikTok task", details: errorMessage },
      { status: 500 }
    );
  }
}
