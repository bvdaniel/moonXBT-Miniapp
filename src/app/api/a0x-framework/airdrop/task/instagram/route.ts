import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

// const {
//   farcasterFid,
//   instagramUsername, // Username de Instagram que el usuario dice que usará
//   targetInstagramUsername, // Username de Instagram objetivo (ej: moonxbt_instagram)
// } = req.body;

interface InstagramTaskBody {
  farcasterFid: number | null;
  instagramUsername: string;
  targetInstagramUsername: string;
  id: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to register a user's intent to complete the Instagram follow task.
 * No automatic verification is performed by this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const body: InstagramTaskBody = await request.json();

    if (!body.farcasterFid && !body.id) {
      return NextResponse.json(
        { error: "farcasterFid or id is required" },
        { status: 400 }
      );
    }

    if (!body.instagramUsername) {
      return NextResponse.json(
        { error: "instagramUsername is required" },
        { status: 400 }
      );
    }

    if (!body.targetInstagramUsername) {
      return NextResponse.json(
        { error: "targetInstagramUsername is required" },
        { status: 400 }
      );
    }

    console.log("Registering Instagram task intent:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/moonxbt/airdrop/task/instagram`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to register Instagram task", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "Instagram task intent registered successfully.",
        fid: body.farcasterFid || body.id,
        taskMarkedCompleted: false,
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error registering Instagram task:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to register Instagram task", details: errorMessage },
      { status: 500 }
    );
  }
}
