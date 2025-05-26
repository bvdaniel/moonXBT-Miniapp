import { NextResponse } from "next/server";
import axios from "axios";

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

interface ParticipantData {
  success: boolean;
  exists: boolean;
  fid?: number;
  username?: string;
  displayName?: string;
  isFollowing?: boolean;
  walletAddress?: string;
  twitterAccount?: string;
  message?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get("fid");

    if (!fid) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter 'fid' is required.",
        },
        { status: 400 }
      );
    }

    const farcasterFid = parseInt(fid, 10);
    if (isNaN(farcasterFid)) {
      return NextResponse.json(
        {
          success: false,
          message: "Query parameter 'fid' must be a valid number.",
        },
        { status: 400 }
      );
    }

    const response = await axios.get(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/participant-exists?fid=${farcasterFid}`
    );

    if (response.status !== 200) {
      throw new Error("Error al obtener el estado del participante");
    }

    const participantData: ParticipantData = response.data;

    return NextResponse.json(participantData);
  } catch (error) {
    console.error("Error al verificar el participante:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al verificar el estado del participante",
      },
      { status: 500 }
    );
  }
}
