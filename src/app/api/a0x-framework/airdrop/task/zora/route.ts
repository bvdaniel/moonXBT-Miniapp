import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

interface ZoraTaskBody {
  farcasterFid: number;
  zoraUsername: string;
  targetZoraUsername: string;
  id: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to register a user's intent to complete the Zora follow task.
 * No automatic verification is performed by this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body: ZoraTaskBody = await request.json();

    if (!body.farcasterFid && !body.id) {
      return NextResponse.json(
        { error: "farcasterFid or id is required" },
        { status: 400 }
      );
    }

    if (!body.zoraUsername) {
      return NextResponse.json(
        { error: "zoraUsername is required" },
        { status: 400 }
      );
    }

    if (!body.targetZoraUsername) {
      return NextResponse.json(
        { error: "targetZoraUsername is required" },
        { status: 400 }
      );
    }

    console.log("Registering Zora task intent:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/moonxbt/airdrop/task/zora`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to register Zora task", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "Zora task intent registered successfully.",
        fid: body.farcasterFid || body.id,
        taskMarkedCompleted: false,
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error registering Zora task:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to register Zora task", details: errorMessage },
      { status: 500 }
    );
  }
}
