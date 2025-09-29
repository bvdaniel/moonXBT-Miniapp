export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const points = searchParams.get("points") || "0";
  const sharedFid = searchParams.get("sharedFid") || "900682";
  const pfpUrl =
    searchParams.get("pfpUrl") || "https://i.ibb.co/QvFx17r6/logo.png";

  // The image URL points to the actual OG image endpoint
  const ogImageUrl = `https://airdrop.moonxbt.fun/api/og?points=${points}&sharedFid=${sharedFid}&pfpUrl=${encodeURIComponent(
    pfpUrl
  )}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MoonXBT Airdrop - Join the @moonXBT_ai airdrop!</title>
  <meta name="description" content="🚀 Join the @moonXBT_ai airdrop! Complete tasks to earn your share of tokens 🌙✨">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${request.url}">
  <meta property="og:title" content="MoonXBT Airdrop - Join the @moonXBT_ai airdrop!">
  <meta property="og:description" content="🚀 Join the @moonXBT_ai airdrop! Complete tasks to earn your share of tokens 🌙✨">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1500">
  <meta property="og:image:height" content="1000">
  <meta property="og:image:alt" content="MoonXBT Airdrop - ${points} points earned">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${request.url}">
  <meta property="twitter:title" content="MoonXBT Airdrop - Join the @moonXBT_ai airdrop!">
  <meta property="twitter:description" content="🚀 Join the @moonXBT_ai airdrop! Complete tasks to earn your share of tokens 🌙✨">
  <meta property="twitter:image" content="${ogImageUrl}">
  <meta property="twitter:image:alt" content="MoonXBT Airdrop - ${points} points earned">
  
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: #1a1a2e;
      color: white;
      text-align: center;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #fff; margin-bottom: 20px; }
    p { color: #ccc; line-height: 1.6; }
    .cta { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 25px;
      text-decoration: none;
      display: inline-block;
      margin-top: 20px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 MoonXBT Airdrop</h1>
    <p>Join the @moonXBT_ai airdrop! Complete tasks to earn your share of tokens 🌙✨</p>
    <p>You've earned <strong>${points} points</strong> so far!</p>
    <a href="https://moonxbt.fun" class="cta">Join the Airdrop</a>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
