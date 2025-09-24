import { NextRequest, NextResponse } from "next/server";

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = (
      searchParams.get("walletAddress") || ""
    ).toLowerCase();
    // targetUsername not required for wallet-based lookup

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress parameter is required" },
        { status: 400 }
      );
    }

    if (!A0X_AGENT_API_URL) {
      return NextResponse.json(
        { error: "Backend URL not configured" },
        { status: 500 }
      );
    }

    const url = `${A0X_AGENT_API_URL}/moonxbt/airdrop/participant-exists?walletAddress=${encodeURIComponent(
      walletAddress
    )}`;

    const resp = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });

    if (!resp.ok) {
      // Graceful empty result for unknown wallet
      return NextResponse.json(
        {
          success: false,
          isFollowing: false,
          lookedUpByWallet: walletAddress,
        },
        { status: 200 }
      );
    }

    const data = await resp.json();

    if (data && data.success) {
      // Pass backend data through, include hints for client
      return NextResponse.json(
        { ...data, lookedUpByWallet: walletAddress },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        isFollowing: false,
        lookedUpByWallet: walletAddress,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying follow status by wallet:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed wallet verification.",
      },
      { status: 500 }
    );
  }
}
