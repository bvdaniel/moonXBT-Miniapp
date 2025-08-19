export enum TaskId {
  HoldA0X = "hold-a0x",
  FollowTwitter = "follow-twitter",
  ShareSocial = "share-social",
  FollowFarcaster = "follow-farcaster",
  FollowTikTok = "follow-tiktok",
  FollowInstagram = "follow-instagram",
  JoinTelegram = "join-telegram",
  FollowZora = "follow-zora",
}

export const REQUIRED_TASKS = {
  web: [TaskId.HoldA0X, TaskId.FollowTwitter, TaskId.ShareSocial] as const,
  miniapp: [TaskId.HoldA0X, TaskId.FollowFarcaster] as const,
};

export const MIN_A0X_REQUIRED = 10_000_000; // tokens (not wei)

export const getRequiredTaskIdsForEnv = (
  isInMiniApp: boolean | null
): string[] =>
  isInMiniApp ? [...REQUIRED_TASKS.miniapp] : [...REQUIRED_TASKS.web];
