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

    // Validar el parámetro refresh como booleano
    const shouldRefresh = refresh === "true";
    console.log("shouldRefresh:", shouldRefresh);

    if (!shouldRefresh) {
      console.log("Entrando en verificación A0X");
      try {
        const a0xApiUrl = `${A0X_AGENT_API_URL}/moonxbt/airdrop/participant-exists?fid=${fid}`;
        console.log("URL A0X:", a0xApiUrl);

        const a0xResponse = await fetch(a0xApiUrl, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        const a0xData = await a0xResponse.json();
        console.log("a0xData completo:", JSON.stringify(a0xData, null, 2));
        console.log("a0xData.success:", a0xData?.success);

        if (a0xData && a0xData.success) {
          console.log("Retornando respuesta A0X exitosa");
          return NextResponse.json(
            {
              ...a0xData,
            },
            { status: 200 }
          );
        } else {
          console.log("A0X no fue exitoso, continuando con el flujo normal");
        }
      } catch (error) {
        console.error("Error verificando A0X:", error);
        return NextResponse.json(
          { error: "Error checking A0X status" },
          { status: 500 }
        );
      }
    } else {
      console.log("Refresh es true, saltando verificación A0X");
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

    console.log("user", user);

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
