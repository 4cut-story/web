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
  /** ARTICLE은 녹음 대신 기사 주소로 만든 대화. */
  source: "RECORDING" | "UPLOAD" | "ARTICLE";
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
  /** 기사로 만든 대화의 원문 주소와 제목. 녹음이면 없다. */
  sourceUrl?: string | null;
  sourceTitle?: string | null;
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

/**
 * 만화 아래 등장인물 한 명. lookId는 캐릭터 모습 그림 (캐릭터를 못 찾았으면 null). 캐릭터를 못 찾은 인물은 만화 컷에서 잘라 낸
 * 얼굴 그림이 있으면 portrait가 true다 (예전 서버는 주지 않는다).
 */
export type CastMember = {
  role: string;
  name: string;
  lookId: string | null;
  portrait?: boolean;
};

/**
 * 작업 하나를 처리한 쪽이 보낸 모델·조건. 처리한 쪽마다 키가 다르다: 전사 whisper·diarization, 외부 LLM model, 로컬 LLM
 * ollama, 그림 flux·sdxl·sd35·qwen 중 하나와 quantization·steps·guidance·lora, 워커 gpu·loadMs·panels.
 */
export type ProductionJobInfo = {
  [key: string]: unknown;
  whisper?: string;
  diarization?: boolean;
  model?: string;
  ollama?: string;
  flux?: string;
  sdxl?: string;
  sd35?: string;
  qwen?: string;
  quantization?: string | null;
  steps?: number;
  guidance?: number;
  lora?: string | null;
  fellBackToSdxl?: boolean;
  gpu?: string;
  loadMs?: number;
  panels?: {
    name?: string;
    ms: number;
    seed?: number;
    width?: number;
    height?: number;
  }[];
};

/** 단계의 GPU 작업 하나. runMs는 실행 시간, waitMs는 대기열에서 기다린 시간. */
export type ProductionJob = {
  type: "TRANSCRIBE" | "LLM" | "IMAGE";
  worker?: string;
  runMs: number;
  waitMs?: number;
  info?: ProductionJobInfo;
};

/** 단계 하나. ms는 시작부터 끝까지(대기 포함), request는 단계가 작업을 넣을 때 남긴 정보(LLM 모델·시드, 그림 시드·크기). */
export type ProductionStep = {
  step: string;
  ms: number;
  attempts: number;
  request?: {
    [key: string]: unknown;
    model?: string;
    seed?: number;
    size?: number;
  };
  jobs: ProductionJob[];
};

/** 만화를 만든 과정 기록 (conversation-service Production, version 1). 예전 만화는 null. */
export type Production = {
  version: number;
  /** 시험 만화: 회차와 비교한 변형 이름 (예: schnell-nf4). 파이프라인 만화는 없다. */
  round?: number;
  variant?: string;
  /** 시험 만화 품질 점수와 만점. */
  score?: number;
  scoreMax?: number;
  totalMs?: number;
  steps: ProductionStep[];
  preTranscribe?: { parts: number; runMs: number };
  /** 기사로 만든 만화의 원문 출처. 녹음으로 만든 만화는 없다. */
  source?: ArticleSource;
};

/** 기사로 만든 만화의 원문 기사. 게시물 아래에 출처 링크로 보인다. */
export type ArticleSource = {
  type: "ARTICLE";
  url: string;
  title?: string | null;
  site?: string | null;
};

/** 만화 아래에 보이는 등장인물과 만든 옵션. 예전 서버·예전 만화는 주지 않는다. */
export type ComicExtras = {
  cast?: CastMember[];
  concept?: Concept | null;
  dialect?: Dialect | null;
  /** 만화 아래 줄거리 요약(몇 문장). 예전 만화는 null. */
  summary?: string | null;
  production?: Production | null;
  /** 라이브 모드 재생 정보가 있는지. 예전 만화·예전 서버는 없다(만화보기만). */
  live?: boolean;
};

/** 라이브 모드 움직임 종류. 모두 배경만 바뀐다 (common contracts/live-mode.yaml). */
export type MotionType =
  "twinkle" | "rain" | "snow" | "flicker" | "shimmer" | "petals" | "breeze";

/** 컷 배경음과 저작자 표시. */
export type PanelSound = {
  publicId: string;
  title: string;
  volume: number;
  fadeMs: number;
  loop: boolean;
  credit?: {
    author?: string | null;
    license?: string | null;
    licenseUrl?: string | null;
    sourceUrl?: string | null;
    originalTitle?: string | null;
  };
};

/** 두 장을 번갈아 보여 주는 움직임. */
export type PanelMotion = {
  type: MotionType;
  /** 두 장, 세 장(세 번째 그림), 또는 넓은 그림 컷의 네 장(FR-049). */
  frames:
    | [string, string]
    | [string, string, string]
    | [string, string, string, string];
  intervalMs: number;
  easing?: string;
};

export type LivePanel = {
  index: number;
  role: string;
  image: string;
  durationMs: number;
  sound: PanelSound | null;
  motion: PanelMotion | null;
  /** 컷이 시작될 때 배경음 위에 한 번 트는 사건 소리(알람, 초인종…). 예전 재생 정보에는 없다. */
  effect?: PanelSound | null;
  /** 그림 비율. 16:9는 라이브 전용 넓은 그림(말풍선 없음)이라 captions를 자막으로 보여 준다. 없으면 1:1. */
  aspect?: "1:1" | "16:9";
  /** 컷 안 대사 자막 (aspect 16:9일 때). */
  captions?: Caption[];
  /** 컷을 보여 주는 동안 그림을 천천히 확대·이동하는 방향. */
  camera?: Camera;
  /** 그림 위에 화면이 얹는 작은 움직임 층(많아야 2개). 예전 재생 정보에는 없다. */
  ambient?: Ambient[];
  /** 넓은 그림 컷의 깊이 지도(밝을수록 가깝다). 있으면 2.5D 패럴랙스로 움직인다. 예전 재생 정보에는 없다. */
  depth?: string | null;
};

export type Ambient =
  | "twinkle"
  | "rain"
  | "snow"
  | "fireflies"
  | "petals"
  | "leaves"
  | "steam"
  | "dust"
  | "flicker"
  | "meteor"
  | "fireworks"
  | "lightning"
  | "glow";

export type Caption = {
  speaker?: string | null;
  text: string;
  startMs: number;
  endMs: number;
};

export type Camera = "none" | "push_in" | "pull_out" | "pan_left" | "pan_right";

/** 라이브 모드 재생 정보 (version 1). 화면은 이 JSON만 읽고 재생한다. */
export type LivePlayback = {
  version: number;
  panels: LivePanel[];
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
  /** 조회수. 같은 방문자(방문자 쿠키)가 10분 안에 다시 본 것은 세지 않는다. 예전 서버는 주지 않는다. */
  viewCount?: number;
  likedByMe: boolean;
};

/** 조회 한 번 남긴 결과. counted가 false면 10분 안에 다시 본 것이라 세지 않았다. */
export type ViewCount = { viewCount: number; counted: boolean };

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: string;
};

/** 팔로워·팔로잉 목록의 한 줄 (002 FR-018). */
export type FollowEntry = {
  userId: string;
  followedAt: string;
  followedByMe: boolean;
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

export type SoundKind = "AMBIENCE" | "EFFECT" | "MUSIC";

/** 배경음 저작자 표시 (CC BY는 저작자·출처·라이선스를 보여 줘야 한다). */
export type SoundCredit = {
  source: string;
  sourceUrl: string;
  originalTitle: string | null;
  author: string;
  license: string;
  licenseUrl: string;
};

export type Sound = {
  id: string;
  kind: SoundKind;
  category: string;
  title: string;
  description: string;
  moods: string[];
  places: string[];
  durationMs: number;
  credit: SoundCredit;
};

export type SoundDetail = { sound: Sound; similar: Sound[] };

export type SoundFacets = {
  categories: { kind: SoundKind; category: string; count: number }[];
  moods: { mood: string; count: number }[];
};

/** RSS 구독에서 본 기사의 결과 (common contracts/rss-feeds.yaml). */
export type RssItemStatus = "MADE" | "SKIPPED" | "SIMILAR" | "FAILED";

export type RssFeedItem = {
  title: string | null;
  link: string;
  status: RssItemStatus;
  reason: string | null;
  conversationId: string | null;
  createdAt: string;
};

/** RSS 구독 하나. autoPublish면 완성되자마자 전체 공개로 게시한다. */
export type RssFeed = {
  id: string;
  url: string;
  title: string;
  siteUrl: string | null;
  autoPublish: boolean;
  enabled: boolean;
  concept: Concept;
  dialect: Dialect;
  lastCheckedAt: string | null;
  lastError: string | null;
  made: number;
  createdAt: string;
  recent: RssFeedItem[];
};
