import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { Hex } from "viem";

// Interfaz actualizada con más campos y sin los deprecados
interface FarcasterManifest {
  accountAssociation?: {
    header: string; // Base64 encoded JSON
    payload: string; // Base64 encoded JSON
    signature: string; // Base64 encoded signature string (originalmente Hex)
  };
  frame: {
    version: string;
    name: string;
    iconUrl: string; // 1024x1024 PNG, no alpha
    homeUrl: string;
    splashImageUrl?: string; // 200x200px
    splashBackgroundColor?: string; // Hex color
    webhookUrl?: string;
    subtitle?: string; // Max 30 chars, no emojis/special
    description?: string; // Max 170 chars, no emojis/special
    screenshotUrls?: string[]; // Portrait, 1284x2778, max 3
    primaryCategory?: string; // e.g., 'games', 'social'
    tags?: string[]; // Up to 5, max 20 chars each, lowercase, no spaces/specials/emojis
    heroImageUrl?: string; // 1200x630px (1.91:1)
    tagline?: string; // Max 30 chars
    ogTitle?: string; // Max 30 chars
    ogDescription?: string; // Max 100 chars
    ogImageUrl?: string; // 1200x630px (1.91:1) PNG
    noindex?: boolean;
    requiredChains?: string[]; // CAIP-2 IDs
    requiredCapabilities?: string[]; // SDK method paths
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SecretEnvVars {
  seedPhrase?: string;
  privateKey?: Hex; // Alternativa a seed phrase
  fid: string;
}

export function getSecretEnvVars(): SecretEnvVars | null {
  const seedPhrase = process.env.SEED_PHRASE;
  const privateKey = process.env.PRIVATE_KEY as Hex | undefined;
  const fid = process.env.FID;

  if (!fid) {
    console.warn(
      "FID not found in environment variables. Cannot generate signed metadata."
    );
    return null;
  }

  if (!seedPhrase && !privateKey) {
    console.warn(
      "Neither SEED_PHRASE nor PRIVATE_KEY found. Cannot generate signed metadata."
    );
    return null;
  }

  if (seedPhrase && privateKey) {
    console.warn(
      "Both SEED_PHRASE and PRIVATE_KEY found. Prioritizing PRIVATE_KEY."
    );
    return { privateKey, fid };
  }

  return { seedPhrase, privateKey, fid };
}

// Helper para obtener arrays de strings desde variables de entorno
function getEnvStringArray(envVarName: string): string[] | undefined {
  const envVar = process.env[envVarName];
  return envVar
    ? envVar
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
    : undefined;
}

export async function generateFarcasterManifest(): Promise<FarcasterManifest> {
  // 1. Intentar cargar metadata pre-firmada desde el entorno
  if (process.env.FARCASTER_MANIFEST_JSON) {
    try {
      const manifest = JSON.parse(process.env.FARCASTER_MANIFEST_JSON);
      console.log(
        "Using pre-defined Farcaster manifest from FARCASTER_MANIFEST_JSON"
      );
      return manifest;
    } catch (error) {
      console.warn(
        "Failed to parse FARCASTER_MANIFEST_JSON from environment:",
        error,
        ". Proceeding to generate dynamically."
      );
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_URL;
  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_URL not configured. This is required for homeUrl, iconUrl, etc."
    );
  }
  // Asegurarse de que appUrl no tenga una barra al final para consistencia
  const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  const domain = new URL(baseUrl).hostname;
  console.log("Using domain for manifest:", domain);

  let accountAssociation;
  const secretEnvVars = getSecretEnvVars();

  if (secretEnvVars) {
    try {
      let account: {
        address: `0x${string}`;
        sign: (parameters: { hash: `0x${string}` }) => Promise<`0x${string}`>;
        signMessage: (parameters: {
          message: string;
        }) => Promise<`0x${string}`>;
      };
      if (secretEnvVars.privateKey) {
        account = privateKeyToAccount(secretEnvVars.privateKey);
      } else if (secretEnvVars.seedPhrase) {
        account = mnemonicToAccount(secretEnvVars.seedPhrase);
      } else {
        // Esto no debería ocurrir debido a la lógica en getSecretEnvVars, pero es una guarda adicional
        throw new Error("No private key or seed phrase available for signing.");
      }

      const custodyAddress = account.address;

      const headerObj = {
        fid: parseInt(secretEnvVars.fid, 10), // Asegurar base 10
        type: "custody",
        key: custodyAddress,
      };
      // Codificación a Base64 estándar
      const encodedHeader = Buffer.from(
        JSON.stringify(headerObj),
        "utf-8"
      ).toString("base64");

      const payloadObj = {
        domain, // El dominio extraído de NEXT_PUBLIC_URL
      };
      // Codificación a Base64 estándar
      const encodedPayload = Buffer.from(
        JSON.stringify(payloadObj),
        "utf-8"
      ).toString("base64");

      const messageToSign = `${encodedHeader}.${encodedPayload}`;
      const signatureHex = await account.signMessage({
        message: messageToSign,
      });

      const encodedSignature = Buffer.from(signatureHex, "utf-8").toString(
        "base64"
      );

      accountAssociation = {
        header: encodedHeader,
        payload: encodedPayload,
        signature: encodedSignature,
      };
      console.log("Generated signed accountAssociation.");
    } catch (error) {
      console.warn(
        "Failed to generate signed accountAssociation:",
        error,
        ". Proceeding with unsigned metadata."
      );
      accountAssociation = undefined; // Asegurar que sea undefined si falla
    }
  } else {
    console.warn(
      "No secret env vars (FID, SEED_PHRASE/PRIVATE_KEY) found. Generating unsigned Farcaster manifest."
    );
    accountAssociation = undefined;
  }

  // Determinar webhook URL
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  const neynarClientId = process.env.NEYNAR_CLIENT_ID;
  const customWebhookUrl = process.env.WEBHOOK_URL; // Permitir un webhook personalizado

  let webhookUrl: string | undefined;
  if (customWebhookUrl) {
    webhookUrl = customWebhookUrl;
  } else if (neynarApiKey && neynarClientId) {
    webhookUrl = `https://api.neynar.com/f/app/${neynarClientId}/event`;
  } else if (process.env.ENABLE_LOCAL_WEBHOOK === "true") {
    // Ser explícito
    webhookUrl = `${baseUrl}/api/webhook`; // Usar baseUrl
  }

  const manifest: FarcasterManifest = {
    ...(accountAssociation && { accountAssociation }), // Añadir solo si existe
    frame: {
      version: "1",
      name: process.env.NEXT_PUBLIC_FRAME_NAME || "My Awesome Farcaster App",
      iconUrl: `${baseUrl}/icon.png`, // Usar baseUrl
      homeUrl: baseUrl, // Usar baseUrl
      splashImageUrl:
        process.env.NEXT_PUBLIC_SPLASH_IMAGE_URL || `${baseUrl}/splash.png`,
      splashBackgroundColor:
        process.env.NEXT_PUBLIC_SPLASH_BG_COLOR || "#f0f0f0",
      ...(webhookUrl && { webhookUrl }), // Añadir solo si existe

      // Campos adicionales (opcionales, configurables vía .env)
      subtitle: process.env.NEXT_PUBLIC_FRAME_SUBTITLE,
      description: process.env.NEXT_PUBLIC_FRAME_DESCRIPTION,
      screenshotUrls: getEnvStringArray("NEXT_PUBLIC_FRAME_SCREENSHOT_URLS"),
      primaryCategory: process.env.NEXT_PUBLIC_FRAME_PRIMARY_CATEGORY,
      tags: getEnvStringArray("NEXT_PUBLIC_FRAME_TAGS"),
      heroImageUrl: process.env.NEXT_PUBLIC_FRAME_HERO_IMAGE_URL,
      tagline: process.env.NEXT_PUBLIC_FRAME_TAGLINE,
      ogTitle: process.env.NEXT_PUBLIC_FRAME_OG_TITLE,
      ogDescription: process.env.NEXT_PUBLIC_FRAME_OG_DESCRIPTION,
      ogImageUrl: process.env.NEXT_PUBLIC_FRAME_OG_IMAGE_URL,
      noindex: process.env.FRAME_NOINDEX === "true" ? true : undefined, // undefined para que no aparezca si no es true
      requiredChains: getEnvStringArray("FRAME_REQUIRED_CHAINS"),
      requiredCapabilities: getEnvStringArray("FRAME_REQUIRED_CAPABILITIES"),
    },
  };

  // Limpiar el objeto frame de propiedades undefined para un JSON más limpio
  for (const key in manifest.frame) {
    if (manifest.frame[key as keyof FarcasterManifest["frame"]] === undefined) {
      delete manifest.frame[key as keyof FarcasterManifest["frame"]];
    }
  }
  if (manifest.accountAssociation === undefined) {
    delete manifest.accountAssociation;
  }

  return manifest;
}
