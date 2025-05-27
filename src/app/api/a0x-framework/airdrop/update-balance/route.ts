import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

interface SwapTransaction {
  hash: string;
  status: string;
  timestamp?: string;
  // Otros campos relevantes de la transacción
}

interface UpdateBalanceBody {
  walletAddress: string;
  transactions: SwapTransaction[];
  timestamp: string; // ISODate string
  currentBalance?: string; // Balance actual en formato string
  farcasterFid: number;
}

interface A0XTokenTaskUpdate {
  completed?: boolean;
  currentBalance?: number;
  verifiedAt?: string; // ISODate string
  lastTransaction?: string; // Hash de la última transacción
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint para actualizar el balance de A0X tokens después de un swap exitoso
 */
export async function POST(request: NextRequest) {
  try {
    const body: UpdateBalanceBody = await request.json();

    if (
      !body.walletAddress ||
      !body.transactions ||
      !body.timestamp ||
      !body.farcasterFid
    ) {
      return NextResponse.json(
        {
          error:
            "walletAddress, transactions, timestamp and farcasterFid are required",
        },
        { status: 400 }
      );
    }

    console.log("Updating A0X balance:", body);

    // Preparar el payload para el backend de A0X
    const payload = {
      walletAddress: body.walletAddress,
      transactions: body.transactions,
      timestamp: body.timestamp,
      currentBalance: body.currentBalance
        ? Number(body.currentBalance)
        : undefined,
      farcasterFid: body.farcasterFid,
    };

    const response = await axios.post(
      `${A0X_AGENT_API_URL}/a0x-framework/airdrop/update-balance`,
      payload
    );

    console.log("Response from A0X Agent:", response.data);

    if (response.status !== 200) {
      return NextResponse.json(
        { error: "Failed to update balance", details: response.data },
        { status: response.status }
      );
    }

    return NextResponse.json(
      {
        message: "Balance updated successfully",
        dataReceived: response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating balance:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to update balance", details: errorMessage },
      { status: 500 }
    );
  }
}
