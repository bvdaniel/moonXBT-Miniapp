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
        checkedUsername: boolean;
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

  async verifyTwitterFollow(data: {
    fid: number;
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
    platform: "instagram" | "tiktok" | "telegram" | "zora",
    data: {
      farcasterFid: number;
      username: string;
      targetUsername: string;
    }
  ) {
    const response = await fetch(
      `/api/a0x-framework/airdrop/task/${platform}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farcasterFid: data.farcasterFid,
          [`${platform}Username`]: data.username,
          [`target${
            platform.charAt(0).toUpperCase() + platform.slice(1)
          }Username`]: data.targetUsername,
        }),
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
