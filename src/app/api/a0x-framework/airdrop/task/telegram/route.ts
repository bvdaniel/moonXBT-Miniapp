import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface TelegramTaskBody {
  farcasterFid: number;
  telegramUsername: string;
  targetTelegramGroup: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to register the status of the Telegram join task, as marked by the user.
 */
export async function POST(request: NextRequest) {
  try {
    const body: TelegramTaskBody = await request.json();

    if (!body.farcasterFid) {
      return NextResponse.json(
        { error: "farcasterFid is required" },
        { status: 400 }
      );
    }

    if (!body.telegramUsername) {
      return NextResponse.json(
        { error: "telegramUsername is required" },
        { status: 400 }
      );
    }

    if (!body.targetTelegramGroup) {
      return NextResponse.json(
        { error: "targetTelegramGroup is required" },
        { status: 400 }
      );
    }

    console.log("Registering Telegram task status:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/task/telegram`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to register Telegram task", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "Telegram task status registered successfully.",
        fid: body.farcasterFid,
        completed: false,
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error registering Telegram task:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to register Telegram task", details: errorMessage },
      { status: 500 }
    );
  }
}
