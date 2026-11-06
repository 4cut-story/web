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
  /** 고른 그림체. 예전 서버는 주지 않는다. */
  concept?: Concept;
};

/** 그림체(콘셉트). 없거나 AUTO면 서버가 대화에 맞춰 고른다. */
export type Concept =
  | "AUTO"
  | "DAILY"
  | "ANIMALS"
  | "WATERCOLOR"
  | "PICTURE_BOOK"
  | "NEWSPAPER"
  | "JOSEON"
  | "WUXIA";

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

export type Gender = "FEMALE" | "MALE";
export type AgeGroup = "CHILD" | "YOUNG" | "MIDDLE" | "OLD";
export type Expression =
  "NEUTRAL" | "HAPPY" | "SAD" | "ANGRY" | "SURPRISED" | "EMBARRASSED";

/** 캐릭터 갤러리 목록 한 칸. coverLookId는 고른 테마의 기본 표정 그림. */
export type CharacterCard = {
  id: string;
  name: string;
  description: string;
  job: string | null;
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  coverLookId: string | null;
};

export type CharacterLook = {
  id: string;
  concept: Exclude<Concept, "AUTO">;
  expression: Expression;
  look: string;
};

export type CharacterDetail = Omit<CharacterCard, "coverLookId"> & {
  looks: CharacterLook[];
};

export type JobCount = { job: string; count: number };
