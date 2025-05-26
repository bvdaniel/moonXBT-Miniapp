import { NextRequest, NextResponse } from "next/server";

interface VerifiedAccount {
  platform: string;
  username: string;
}

const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";

/**
 * Endpoint to verify if a Farcaster user follows a specific account
 * and fetch their Twitter/X account information
 *
 * @param request HTTP request with FID and targetUsername parameters
 * @returns JSON response with follow status and user details
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get("fid");
    const refresh = searchParams.get("refresh");
    const targetUsername = searchParams.get("targetUsername");

    // Validate parameters
    if (!fid) {
      return NextResponse.json(
        { error: "fid parameter is required" },
        { status: 400 }
      );
    }

    if (!targetUsername) {
      return NextResponse.json(
        { error: "targetUsername parameter is required" },
        { status: 400 }
      );
    }

    if (refresh !== "true") {
      try {
        const a0xApiUrl = `${A0X_AGENT_API_URL}/a0x-framework/airdrop/participant-exists?fid=${fid}`;

        const a0xResponse = await fetch(a0xApiUrl, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (a0xResponse.ok) {
          const a0xData = await a0xResponse.json();
          return NextResponse.json(
            {
              fid: a0xData.fid,
              username: a0xData.username,
              displayName: a0xData.displayName,
              isFollowing: a0xData.isFollowing,
              walletAddress: a0xData.walletAddress,
              twitterAccount: a0xData.twitterAccount,
              pfpUrl: a0xData.farcasterPfpUrl,
              ...a0xData,
            },
            { status: 200 }
          );
        }
      } catch (error) {
        console.error("Error verifying follow status:", error);
      }
    }

    const moonxbtFid = 900682;
    // First, get user information using the bulk endpoint
    const userApiUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}&viewer_fid=${moonxbtFid}&limit=1`;

    const userResponse = await fetch(userApiUrl, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      return NextResponse.json(
        {
          error: "Error fetching user data from Farcaster API",
          details: errorData,
        },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // Extract user data
    const user =
      userData.users && userData.users.length > 0 ? userData.users[0] : null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract Twitter account if available
    const twitterAccount = user.verified_accounts?.find(
      (account: VerifiedAccount) =>
        account.platform === "x" || account.platform === "twitter"
    );

    // Return consolidated user data
    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      isFollowing: user.viewer_context.followed_by,
      profilePicture: user.pfp_url,
      walletAddress:
        user.verified_addresses.primary.eth_address ||
        user.verified_addresses.eth_addresses[0],
      twitterAccount: twitterAccount?.username,
      targetUsername,
    });
  } catch (error) {
    console.error("Error verifying follow status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
