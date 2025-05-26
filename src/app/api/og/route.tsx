/** @jsxImportSource react */
import { ImageResponse } from '@vercel/og';

type NeynarUser = {
  fid: number;
  pfp_url: string;
  follower_count?: number;
};

export const runtime = 'edge';

async function fetchFont() {
  const fontUrl = new URL('/fonts/PressStart2P-Regular.ttf', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  const fontRes = await fetch(fontUrl.toString());
  return fontRes.arrayBuffer();
}

async function getRelevantFollowers(targetFid: number, viewerFid: number) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/followers/relevant?target_fid=${targetFid}&viewer_fid=${viewerFid}`,
    {
      headers: {
        'accept': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY!,
      },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) {
    console.error('Neynar relevant followers API error:', await res.text());
    return [];
  }
  const data = await res.json();
  return (data?.top_relevant_followers_hydrated ?? [])
    .slice(0, 5)
    .map((f: { user: NeynarUser }) => f.user.pfp_url);
}

export async function GET() {
  const moonxbtFid = 900682;
  const viewerFid = 12785; // your FID for testing

  // Get relevant avatars
  const avatars = await getRelevantFollowers(moonxbtFid, viewerFid);

  // Get MoonXBT's true follower count using the bulk endpoint
  const bulkRes = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${moonxbtFid},${viewerFid}`,
    {
      headers: {
        'accept': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY!,
      },
      next: { revalidate: 60 },
    }
  );
  const bulkData = await bulkRes.json();
  const users: NeynarUser[] = bulkData.users || [];
  const followerCount = users[0]?.follower_count ?? 0;
  // Try to get the viewer's avatar from Neynar
  const userAvatar = users.find((u) => u.fid === viewerFid)?.pfp_url;
  const avatarSrc = userAvatar || "https://i.ibb.co/QvFx17r6/logo.png";

  const fontData = await fetchFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: 1500,
          height: 1000,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'black',
          fontFamily: 'Press Start 2P',
        }}
      >
        <img
          src="http://localhost:3000/opengraph-image.png"
          width={1500}
          height={1000}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          alt="MoonXBT OG Background"
        />
        {/* Overlay avatars and count */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 120,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            justifyContent: 'center',
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
                borderRadius: '50%',
                border: '4px solid #fff',
                marginLeft: i === 0 ? 0 : -24,
                background: '#222',
              }}
              alt=""
            />
          ))}
          <span
            style={{
              color: '#fff',
              fontSize: 40,
              fontWeight: 700,
              marginLeft: 32,
              textShadow: '0 2px 8px #000',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              paddingTop: 20,
            }}
          >
            +{followerCount -26} already<br />following
          </span>
        </div>
        {/* User avatar and points placeholder */}
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 530,
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            background: 'rgba(0,0,0,0.75)',
            padding: '32px 32px',
            borderRadius: 48,
            boxShadow: '0 8px 48px #000a',
            justifyContent: 'center',
            height: 220,
          }}
        >
          <img
            src={avatarSrc}
            width={180}
            height={180}
            style={{
              borderRadius: '50%',
              border: '6px solid #fff',
              boxShadow: '0 0 24px #fff8',
              background: '#222',
            }}
            alt="User Avatar"
          />
          <span
            style={{
              color: '#fff',
              fontSize: 50,
              fontWeight: 600,
              textShadow: '0 4px 24px #000, 0 2px 8px #000, 2px 2px 0 #00f, -2px -2px 0 #f0f',
              letterSpacing: 2,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              height: '100%',
              paddingTop: 32,
            }}
          >
            500 airdrop<br /> points
          </span>
        </div>
      </div>
    ),
    {
      width: 1500,
      height: 1000,
      fonts: [
        {
          name: 'Press Start 2P',
          data: fontData,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
} 