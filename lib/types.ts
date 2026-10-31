/** 게이트웨이 API 응답 모양 (common/contracts 기준). */
export type Page<T> = { items: T[]; nextCursor: string | null };

export type User = { id: string; nickname: string; avatarUrl: string | null };

export type Me = User & { providers: string[] };

export type ConversationStatus =
  | "RECORDING"
  | "QUEUED"
  | "TRANSCRIBING"
  | "SELECTING"
  | "SCRIPTING"
  | "DRAWING"
  | "COMPOSING"
  | "DONE"
  | "GPU_WAITING"
  | "FAILED"
  | "NO_SCENE";

export type Conversation = {
  id: string;
  source: "RECORDING" | "UPLOAD";
  status: ConversationStatus;
  stage: ConversationStatus;
  progress: number;
  retries: number;
  failureReason: string | null;
  comicId: string | null;
  createdAt: string;
};

export type Comic = {
  id: string;
  conversationId: string;
  title: string | null;
  language: string | null;
  nameWarnings: string[];
  state: "IN_INBOX" | "POSTED";
  postId: string | null;
  createdAt: string;
};

export type Visibility = "PUBLIC" | "FOLLOWERS";

export type Post = {
  postId: string;
  comicId: string;
  authorId: string;
  title: string | null;
  caption: string | null;
  visibility: Visibility;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type FollowStats = {
  followers: number;
  following: number;
  followedByMe: boolean;
};
