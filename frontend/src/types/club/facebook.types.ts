export type ClubFacebookPageInfo = {
  pageId: string;
  pageName: string;
  pageLink?: string;
  avatarUrl?: string;
  followersCount: number;
  fanCount: number;
  connectedAt: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
};

export type ClubFacebookEngagementSummary = {
  followersCount: number;
  fanCount: number;
  postsCount: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  avgEngagementPerPost: number;
};

export type ClubFacebookPostItem = {
  id: string;
  fbPostId: string;
  message?: string;
  permalinkUrl?: string;
  imageUrl?: string;
  publishedAt: string;
  reactionsCount: number;
  commentsCount: number;
  sharesCount: number;
  syncedAt: string;
};

export type ClubFacebookOverview = {
  clubId: string;
  connected: boolean;
  oauthConfigured: boolean;
  page?: ClubFacebookPageInfo | null;
  summary: ClubFacebookEngagementSummary;
  posts: ClubFacebookPostItem[];
};

export type ClubFacebookPublicFeed = {
  clubId: string;
  connected: boolean;
  pageName?: string;
  pageLink?: string;
  avatarUrl?: string;
  followersCount: number;
  lastSyncedAt?: string;
  posts: ClubFacebookPostItem[];
};

export type ClubFacebookOAuthPageOption = {
  pageId: string;
  pageName: string;
  pageLink?: string;
  avatarUrl?: string;
  followersCount: number;
  fanCount: number;
  tasks: string[];
};
