import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface FarcasterTaskUpdate {
  completed?: boolean;
  verifiedAt?: string; // ISODate string
  // ... otros campos específicos de la tarea de Farcaster
}

interface A0XTokenTaskUpdate {
  completed?: boolean;
  currentBalance?: number;
  verifiedAt?: string; // ISODate string
  // ... otros campos específicos de la tarea de token A0X
}

interface VerifyTwitterFollowBody {
  fid: number; // Requerido para identificar al participante
  farcasterFid: number; // Requerido para identificar al participante
  twitterUsername: string; // Requerido: el nombre de usuario de Twitter del participante
  targetTwitterUsername: string; // Requerido: el nombre de usuario de Twitter objetivo a seguir
  walletAddress: string;

  // Campos opcionales para actualizar otras tareas o datos del participante
  farcasterUsername?: string;
  farcasterDisplayName?: string;
  tasks?: {
    "follow-farcaster"?: FarcasterTaskUpdate;
    "hold-a0x"?: A0XTokenTaskUpdate;
    // No se incluye "follow-twitter" aquí explícitamente porque el propósito principal del endpoint es verificarlo
  };
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to verify Twitter follow status and potentially update other tasks.
 */
export async function POST(request: NextRequest) {
  try {
    const body: VerifyTwitterFollowBody = await request.json();

    if (
      !body.fid ||
      !body.twitterUsername ||
      !body.targetTwitterUsername ||
      !body.walletAddress
    ) {
      return NextResponse.json(
        {
          error:
            "fid, twitterUsername, targetTwitterUsername, and walletAddress are required",
        },
        { status: 400 }
      );
    }

    body.farcasterFid = body.fid;

    console.log("Verifying Twitter follow and updating tasks:", body);

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/verify-twitter-follow`,
      body
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to verify Twitter follow", details: response.data },
        { status: response.status }
      );
    }

    const isActuallyFollowingTwitter = response.data.isFollowing;

    return NextResponse.json(
      {
        message: "Twitter follow verification processed.",
        isFollowing: isActuallyFollowingTwitter, // Devolver el estado real de seguimiento
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying Twitter follow:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to verify Twitter follow", details: errorMessage },
      { status: 500 }
    );
  }
}
