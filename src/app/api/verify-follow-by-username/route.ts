import { NextRequest, NextResponse } from "next/server";

interface VerifiedAccount {
  platform: string;
  username: string;
}

interface FarcasterUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
}

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const A0X_AGENT_API_URL = process.env.A0X_AGENT_API_URL || "";

/**
 * Endpoint to verify if a Farcaster username follows a specific account
 * This is used for web users who don't have access to miniapp context
 *
 * @param request HTTP request with username and targetUsername parameters
 * @returns JSON response with follow status and user details
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username");
    const targetUsername = searchParams.get("targetUsername");
    const walletAddress = searchParams.get("walletAddress"); // Optional, for web users

    // Validate parameters
    if (!username) {
      return NextResponse.json(
        { error: "username parameter is required" },
        { status: 400 }
      );
    }

    if (!targetUsername) {
      return NextResponse.json(
        { error: "targetUsername parameter is required" },
        { status: 400 }
      );
    }

    // First, search for the user by username to get their FID
    const searchApiUrl = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(
      username
    )}&limit=5`;

    const searchResponse = await fetch(searchApiUrl, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      return NextResponse.json(
        {
          error: "Error searching for user in Farcaster API",
          details: errorData,
        },
        { status: searchResponse.status }
      );
    }

    const searchData = await searchResponse.json();

    // Find exact username match (case insensitive)
    const exactUser = searchData.result?.users?.find(
      (user: FarcasterUser) =>
        user.username?.toLowerCase() === username.toLowerCase()
    );

    if (!exactUser) {
      return NextResponse.json(
        {
          error: "User not found",
          message: `Farcaster user @${username} not found. Please check the username.`,
        },
        { status: 404 }
      );
    }

    const userFid = exactUser.fid;
    const moonxbtFid = 900682; // moonXBT's FID for viewer context

    // Now get detailed user information with follow status
    const userApiUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${userFid}&viewer_fid=${moonxbtFid}&limit=1`;

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
          error: "Error fetching user details from Farcaster API",
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
      return NextResponse.json(
        { error: "User details not found" },
        { status: 404 }
      );
    }

    // Extract Twitter account if available
    const twitterAccount = user.verified_accounts?.find(
      (account: VerifiedAccount) =>
        account.platform === "x" || account.platform === "twitter"
    );

    const isFollowing = user.viewer_context?.followed_by || false;
    const userWalletAddress =
      user.verified_addresses?.primary?.eth_address ||
      user.verified_addresses?.eth_addresses?.[0] ||
      walletAddress || // Use provided walletAddress if no verified address
      null;

    console.log(`Verification for @${username}:`, {
      fid: user.fid,
      isFollowing,
      targetUsername,
      walletAddress: userWalletAddress,
    });

    // Send data to A0X backend if we have sufficient information
    try {
      if (A0X_AGENT_API_URL && userWalletAddress) {
        console.log("Sending verification data to A0X backend...");

        const a0xData = {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          pfpUrl: user.pfp_url,
          isFollowingFarcaster: isFollowing,
          walletAddress: userWalletAddress,
          referredByFid: null, // Could be passed as parameter if needed
        };

        const a0xResponse = await fetch(
          `${A0X_AGENT_API_URL}/moonxbt/airdrop/initialize-participant`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(a0xData),
          }
        );

        if (a0xResponse.ok) {
          console.log("Successfully sent data to A0X backend");
        } else {
          console.warn(
            "Failed to send data to A0X backend:",
            await a0xResponse.text()
          );
        }
      } else {
        console.log(
          "Skipping A0X backend call - missing A0X_AGENT_API_URL or walletAddress"
        );
      }
    } catch (a0xError) {
      console.error("Error sending data to A0X backend:", a0xError);
      // Don't fail the main request if A0X call fails
    }

    // Return consolidated user data
    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      isFollowing,
      profilePicture: user.pfp_url,
      walletAddress: userWalletAddress,
      twitterAccount: twitterAccount?.username || null,
      targetUsername,
      searchedUsername: username,
    });
  } catch (error) {
    console.error("Error verifying follow status by username:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to verify follow status. Please try again.",
      },
      { status: 500 }
    );
  }
}
