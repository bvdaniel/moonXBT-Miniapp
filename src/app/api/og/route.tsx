/* eslint-disable @next/next/no-img-element */
/** @jsxImportSource react */
import { ImageResponse } from "@vercel/og";

type NeynarUser = {
  fid: number;
  pfp_url: string;
  follower_count?: number;
};

export const runtime = "edge";

const siteUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

async function fetchFont() {
  // Skip custom font loading to avoid compatibility issues with Vercel OG
  // The system will fall back to system-ui which works well
  return new ArrayBuffer(0);
}

async function getRelevantFollowers(targetFid: number, viewerFid: number) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/followers/relevant?target_fid=${targetFid}&viewer_fid=${viewerFid}`,
    {
      headers: {
        accept: "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) {
    console.error("Neynar relevant followers API error:", await res.text());
    return [];
  }
  const data = await res.json();
  // const mockData = [
  //   {
  //     object: "follow",
  //     user: {
  //       object: "user",
  //       fid: 13874,
  //       username: "thedude",
  //       display_name: "The Dude Bart🐘🌳 ⌐◨-◨",
  //       pfp_url:
  //         "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/0f7eb529-86c0-4166-312f-81242f438400/original",
  //       custody_address: "0x35b532e3d91a43325433c445c5881e944ff12221",
  //       profile: {
  //         bio: {
  //           text: "Digital Media Producer. I like particles and waves too. I like art.",
  //         },
  //       },
  //       follower_count: 19672,
  //       following_count: 4814,
  //       verifications: [
  //         "0xdd8a40a15f0fe67d4ec52adf0ee24489e8d8a58a",
  //         "0x9ffaab6c24d4fb58d61b26b08c8795e9e323f28b",
  //         "0x2a15b70605812d5b97ac7de7d116256fdf0e58aa",
  //       ],
  //       verified_addresses: {
  //         eth_addresses: [
  //           "0xdd8a40a15f0fe67d4ec52adf0ee24489e8d8a58a",
  //           "0x9ffaab6c24d4fb58d61b26b08c8795e9e323f28b",
  //           "0x2a15b70605812d5b97ac7de7d116256fdf0e58aa",
  //         ],
  //         sol_addresses: [
  //           "zYn4eWZPv7JkRWLqzenBxFU5t1RjRuQh34p4eroK4zY",
  //           "C9wSCceL6Ee8YXfHerH7yLCqtBnMMqK7Sk8Kim8wGBGV",
  //         ],
  //         primary: {
  //           eth_address: "0xdd8a40a15f0fe67d4ec52adf0ee24489e8d8a58a",
  //           sol_address: "C9wSCceL6Ee8YXfHerH7yLCqtBnMMqK7Sk8Kim8wGBGV",
  //         },
  //       },
  //       verified_accounts: [{ platform: "x", username: "thedudea" }],
  //       power_badge: true,
  //       experimental: {
  //         neynar_user_score: 1,
  //         deprecation_notice:
  //           "The `neynar_user_score` field under `experimental` will be deprecated after June 1, 2025, as it will be formally promoted to a stable field named `score` within the user object.",
  //       },
  //       score: 1,
  //     },
  //   },
  //   {
  //     object: "follow",
  //     user: {
  //       object: "user",
  //       fid: 253127,
  //       username: "bleu.eth",
  //       display_name: "agusti",
  //       pfp_url:
  //         "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/689b9276-c643-48ee-ed05-9ffdeb000100/rectcrop3",
  //       custody_address: "0xdbcd4dc537ea96ead3439575027729e3e6c30db4",
  //       profile: {
  //         bio: {
  //           text: "CEO and Founder of $BLEU\n\nDeveloping infinite memetics AI Agent @elefant\n\n\nlebleuelefant.com",
  //           mentioned_profiles: [
  //             {
  //               object: "user_dehydrated",
  //               fid: 533608,
  //               username: "elefant",
  //               display_name: "",
  //               pfp_url:
  //                 "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/4e882ae0-218f-4ac5-bbf6-91c2657e3700/rectcrop3",
  //               custody_address: "0x39ae0644837167a17cf6d24e5f2f0e4a70a0505e",
  //             },
  //           ],
  //           mentioned_profiles_ranges: [{ start: 64, end: 72 }],
  //         },
  //       },
  //       follower_count: 25866,
  //       following_count: 3301,
  //       verifications: [
  //         "0xe9dadd9ded105d67e6cb7aadc48be0c2d45df652",
  //         "0xc4239467a62edaad4a098235a6754579e6662566",
  //         "0x38a0d87bdeac77ac859ac910a588cf80a05d854d",
  //       ],
  //       verified_addresses: {
  //         eth_addresses: [
  //           "0xe9dadd9ded105d67e6cb7aadc48be0c2d45df652",
  //           "0xc4239467a62edaad4a098235a6754579e6662566",
  //           "0x38a0d87bdeac77ac859ac910a588cf80a05d854d",
  //         ],
  //         sol_addresses: [
  //           "FKHNTiWwBbaPwST7v4w7AtK6P1gykWN9yvTMZAAjZRfk",
  //           "34WuNbkSp9eBDcdbHiKctQ2m4xGJV6pwECAJbuXYBABb",
  //         ],
  //         primary: {
  //           eth_address: "0x38a0d87bdeac77ac859ac910a588cf80a05d854d",
  //           sol_address: "34WuNbkSp9eBDcdbHiKctQ2m4xGJV6pwECAJbuXYBABb",
  //         },
  //       },
  //       verified_accounts: [{ platform: "x", username: "bleuonbase" }],
  //       power_badge: true,
  //       experimental: {
  //         neynar_user_score: 1,
  //         deprecation_notice:
  //           "The `neynar_user_score` field under `experimental` will be deprecated after June 1, 2025, as it will be formally promoted to a stable field named `score` within the user object.",
  //       },
  //       score: 1,
  //     },
  //   },
  //   {
  //     object: "follow",
  //     user: {
  //       object: "user",
  //       fid: 18570,
  //       username: "qt",
  //       display_name: "qt",
  //       pfp_url:
  //         "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/a222d761-982c-49e8-6984-7d1b42a8c800/original",
  //       custody_address: "0xc4e4a021fef5b18fb0fd8c0ad91e34e246b614a8",
  //       profile: {
  //         bio: {
  //           text: "👨🏻‍🍳 Better cook than I look 👨🏻‍🍳 \n🧪 Dada scientist 🧪 \n📐 Student of design 📐 \n👾 👾 👾 👾 👾 \n\n /ai-art",
  //           mentioned_channels: [
  //             {
  //               object: "channel_dehydrated",
  //               id: "ai-art",
  //               name: "AI art",
  //               image_url: "https://i.imgur.com/TywLGzR.jpg",
  //             },
  //           ],
  //           mentioned_channels_ranges: [{ start: 140, end: 147 }],
  //         },
  //       },
  //       follower_count: 30554,
  //       following_count: 2575,
  //       verifications: [
  //         "0x198109b0d2c786a230d18b622d3b7a1946131e09",
  //         "0xad3d6f4934faa8e317de00b6f88a54aecc17b2e3",
  //       ],
  //       verified_addresses: {
  //         eth_addresses: [
  //           "0x198109b0d2c786a230d18b622d3b7a1946131e09",
  //           "0xad3d6f4934faa8e317de00b6f88a54aecc17b2e3",
  //         ],
  //         sol_addresses: [
  //           "B7k6RCuunXhqWNWunSL3PjZoEaHz6REtyJPW5i1cLRGV",
  //           "5zo9L6QRkARhEcrkjToPz7MTPGN45rwtVbwPbqGmasmi",
  //         ],
  //         primary: {
  //           eth_address: "0xad3d6f4934faa8e317de00b6f88a54aecc17b2e3",
  //           sol_address: "5zo9L6QRkARhEcrkjToPz7MTPGN45rwtVbwPbqGmasmi",
  //         },
  //       },
  //       verified_accounts: [{ platform: "x", username: "downtimemachine" }],
  //       power_badge: true,
  //       experimental: {
  //         neynar_user_score: 0.99,
  //         deprecation_notice:
  //           "The `neynar_user_score` field under `experimental` will be deprecated after June 1, 2025, as it will be formally promoted to a stable field named `score` within the user object.",
  //       },
  //       score: 0.99,
  //     },
  //   },
  // ];
  // return mockData.slice(0, 5).map((f: { user: NeynarUser }) => f.user.pfp_url);
  return (data?.top_relevant_followers_hydrated ?? [])
    .slice(0, 5)
    .map((f: { user: NeynarUser }) => f.user.pfp_url);
}

export async function GET(request: Request) {
  const moonxbtFid = 900682;
  const { searchParams } = new URL(request.url);
  const viewerFid = searchParams.get("viewerFid") || "12785";
  const points = searchParams.get("points") || "100";
  const pfpUrl =
    searchParams.get("pfpUrl") || "https://i.ibb.co/QvFx17r6/logo.png";

  // Get relevant avatars
  const avatars = await getRelevantFollowers(moonxbtFid, Number(viewerFid));

  console.log("avatars", avatars);

  // Get MoonXBT's true follower count using the bulk endpoint
  const bulkRes = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${moonxbtFid}`,
    {
      headers: {
        accept: "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
      next: { revalidate: 60 },
    }
  );
  const bulkData = await bulkRes.json();
  // const mockBulkData = {
  //   users: [
  //     {
  //       object: "user",
  //       fid: 900682,
  //       username: "ai420z",
  //       display_name: "moonXBT",
  //       pfp_url:
  //         "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/ceeee346-c1bc-4044-4050-31472fcd5f00/rectcrop3",
  //       custody_address: "0xf0d29d9366efad8aa03f1be212577b0fd5854197",
  //       profile: { bio: { text: "Moonxbt.fun" } },
  //       follower_count: 76,
  //       following_count: 1,
  //       verifications: ["0x65a33f508b550ed88e5970157323aaf04b4584e1"],
  //       verified_addresses: {
  //         eth_addresses: ["0x65a33f508b550ed88e5970157323aaf04b4584e1"],
  //         sol_addresses: [],
  //         primary: {
  //           eth_address: "0x65a33f508b550ed88e5970157323aaf04b4584e1",
  //           sol_address: null,
  //         },
  //       },
  //       verified_accounts: [],
  //       power_badge: false,
  //       experimental: {
  //         neynar_user_score: 0.62,
  //         deprecation_notice:
  //           "The `neynar_user_score` field under `experimental` will be deprecated after June 1, 2025, as it will be formally promoted to a stable field named `score` within the user object.",
  //       },
  //       score: 0.62,
  //     },
  //   ],
  //   next: { cursor: null },
  // };
  const users: NeynarUser[] = bulkData.users || [];
  // const users: NeynarUser[] = mockBulkData.users || [];
  const followerCount = users[0]?.follower_count ?? 0;

  const imageResponseOptions = {
    width: 1500,
    height: 1000,
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: 1500,
          height: 1000,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: siteUrl.includes("localhost")
            ? "black"
            : "linear-gradient(135deg,#000 0%, #16213e 50%, #0f3460 100%)",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <img
          // src={`${siteUrl}/opengraph-image.png`}
          src={`https://github.com/bvdaniel/moonXBT-Miniapp/blob/main/public/opengraph-image.png?raw=true`}
          width={1500}
          height={1000}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          alt="MoonXBT OG Background"
        />
        {/* Overlay avatars and count */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 120,
            display: "flex",
            alignItems: "center",
            gap: 16,
            justifyContent: "center",
            height: 96,
          }}
        >
          {avatars.map((url: string, i: number) => (
            <img
              key={i}
              src={url}
              width={96}
              height={96}
              style={{
                borderRadius: "50%",
                border: "4px solid #fff",
                marginLeft: i === 0 ? 0 : -24,
                background: "#222",
              }}
              alt=""
            />
          ))}
          <span
            style={{
              color: "#fff",
              fontSize: 40,
              fontWeight: 700,
              marginLeft: 32,
              textShadow: "0 2px 8px #000",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              paddingTop: 20,
            }}
          >
            +{followerCount - 26} already
            <br />
            following
          </span>
        </div>
        {/* User avatar and points placeholder */}
        <div
          style={{
            position: "absolute",
            left: 100,
            top: 530,
            display: "flex",
            alignItems: "center",
            gap: 32,
            background: "rgba(0,0,0,0.75)",
            padding: "32px 32px",
            borderRadius: 48,
            boxShadow: "0 8px 48px #000a",
            justifyContent: "center",
            height: 220,
          }}
        >
          <img
            src={pfpUrl}
            width={180}
            height={180}
            style={{
              borderRadius: "50%",
              border: "6px solid #fff",
              boxShadow: "0 0 24px #fff8",
              background: "#222",
            }}
            alt="User Avatar"
          />
          <span
            style={{
              color: "#fff",
              fontSize: 50,
              fontWeight: 600,
              textShadow:
                "0 4px 24px #000, 0 2px 8px #000, 2px 2px 0 #00f, -2px -2px 0 #f0f",
              letterSpacing: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              paddingTop: 32,
            }}
          >
            {points} airdrop
            <br /> points
          </span>
        </div>
      </div>
    ),
    imageResponseOptions
  );
}
