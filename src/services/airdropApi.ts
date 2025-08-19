import { fetchJson } from "@/lib/http";
export interface UserInfo {
  fid: number;
  username: string;
  displayName: string;
  profilePicture: string;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  walletAddress: string;
  twitterAccount: string | null;
  tasks: {
    [key: string]: {
      isRequired: boolean;
      isCompleted: boolean;
      verificationDetails: {
        checkedUsername: string;
        submittedUsername?: string;
        targetUsername: string;
        targetGroup: string;
      };
      verificationAttempts: number;
      lastVerified: string;
      completed: boolean;
      telegramUsername: string;
    };
  };
  points?: number;
}

export interface FarcasterFollowResponse {
  fid: number;
  username: string;
  displayName: string;
  isFollowing: boolean;
  profilePicture: string;
  walletAddress: string | null;
  twitterAccount: string | null;
  targetUsername: string;
  searchedUsername: string;
}

export interface ParticipantSnapshotTask {
  completed?: boolean;
  verificationDetails?: unknown;
}

export interface ParticipantSnapshot {
  success?: boolean;
  fid?: number;
  username?: string;
  walletAddress?: string;
  isFollowing?: boolean;
  tasks?: Record<string, ParticipantSnapshotTask>;
}

export const airdropApi = {
  async verifyFarcasterFollow(
    fid: number,
    targetUsername: string,
    refresh: boolean = false
  ): Promise<UserInfo> {
    const response = await fetch(
      `/api/verify-follow?fid=${fid}&targetUsername=${targetUsername}&refresh=${refresh}`
    );

    if (!response.ok) {
      throw new Error("Failed to verify Farcaster follow");
    }

    return response.json();
  },

  async verifyFarcasterFollowByUsername(
    username: string,
    targetUsername: string,
    walletAddress?: string
  ): Promise<FarcasterFollowResponse> {
    const params = new URLSearchParams({
      username,
      targetUsername,
    });

    if (walletAddress) {
      params.append("walletAddress", walletAddress);
    }

    const response = await fetch(
      `/api/verify-follow-by-username?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to verify Farcaster follow by username"
      );
    }

    return response.json();
  },

  async initializeParticipant(data: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl: string;
    isFollowingFarcaster: boolean;
    walletAddress: string;
    referredByFid: number | null;
  }) {
    const response = await fetch(
      "/api/a0x-framework/airdrop/initialize-participant",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to initialize participant");
    }

    return response.json();
  },

  async getParticipantSnapshot(params: {
    fid?: number | string | null;
    walletAddress?: string;
  }): Promise<ParticipantSnapshot> {
    const { fid } = params || {};
    if (fid === undefined || fid === null || fid === "") {
      throw new Error("getParticipantSnapshot requires a valid fid");
    }

    const url = `/api/a0x-framework/airdrop/participant-exists?fid=${fid}`;
    try {
      return await fetchJson<ParticipantSnapshot>(url);
    } catch (err: any) {
      throw new Error(
        `Failed to fetch participant snapshot: ${String(err?.message || err)}`
      );
    }
  },

  async verifyTwitterFollow(data: {
    fid: number | string | null;
    twitterUsername: string;
    targetTwitterUsername: string;
    walletAddress: string;
  }) {
    const response = await fetch(
      "/api/a0x-framework/airdrop/verify-twitter-follow",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to verify Twitter follow");
    }

    return response.json();
  },

  async registerSocialTask(
    platform: "instagram" | "tiktok" | "telegram" | "zora" | "farcaster",
    data: {
      farcasterFid: number | null;
      username: string;
      targetUsername: string;
      walletAddress: string;
    }
  ) {
    let targetTelegramGroup = "";
    if (platform === "telegram") {
      targetTelegramGroup = data.targetUsername || "";
    }
    const body: {
      id?: string;
      farcasterFid?: number;
      [key: string]: string | number | undefined;
      targetTelegramGroup?: string;
    } = {
      [`${platform}Username`]: data.username,
      [`target${platform.charAt(0).toUpperCase() + platform.slice(1)}Username`]:
        data.targetUsername,
      targetTelegramGroup,
    };

    if (!data.farcasterFid) {
      body.id = data.walletAddress;
    } else {
      body.farcasterFid = data.farcasterFid;
    }

    const response = await fetch(
      `/api/a0x-framework/airdrop/task/${platform}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to register ${platform} task`);
    }

    return response.json();
  },

  async updateBalance(data: {
    farcasterFid?: number;
    walletAddress: string;
    transactions: unknown[];
    timestamp: string;
    currentBalance: string | null;
  }) {
    const response = await fetch("/api/a0x-framework/airdrop/update-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update balance");
    }

    return response.json();
  },
};
