/** 게이트웨이 API 응답 모양 (common/contracts 기준). */
export type Page<T> = { items: T[]; nextCursor: string | null };

export type User = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  /** 가입 시각 (ISO-8601). */
  joinedAt?: string;
};

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
  /** 고른 사투리. 예전 서버는 주지 않는다. */
  dialect?: Dialect;
};

/** 말풍선 대사 사투리. 없거나 NONE이면 사투리로 바꾸지 않는다. */
export type Dialect =
  "NONE" | "GYEONGSANG" | "JEOLLA" | "CHUNGCHEONG" | "GANGWON" | "SEOUL";

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

/** 만화 아래 등장인물 한 명. lookId는 캐릭터 모습 그림 (캐릭터를 못 찾았으면 null). */
export type CastMember = {
  role: string;
  name: string;
  lookId: string | null;
};

/** 만화 아래에 보이는 등장인물과 만든 옵션. 예전 서버·예전 만화는 주지 않는다. */
export type ComicExtras = {
  cast?: CastMember[];
  concept?: Concept | null;
  dialect?: Dialect | null;
};

export type Comic = ComicExtras & {
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

export type Post = ComicExtras & {
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
  /** 보는 사람이 볼 수 있는 게시물 수. */
  posts?: number;
  /** 그 게시물들이 받은 좋아요 합계. */
  likes?: number;
  /** 만든 4컷 전체 수. 본인이 볼 때만 온다. */
  comics?: number;
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
