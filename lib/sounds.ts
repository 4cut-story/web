import type { SoundKind } from "./types";

/** 배경음 종류·카테고리·분위기 표시 이름. 코드는 conversation-service background_sounds와 같다. */
export const SOUND_KINDS: { value: SoundKind; label: string }[] = [
  { value: "AMBIENCE", label: "장소·환경음" },
  { value: "EFFECT", label: "효과음" },
  { value: "MUSIC", label: "배경음악" },
];

export const SOUND_CATEGORIES: Record<string, string> = {
  SCHOOL_KIDS: "학교에서 아이들 떠드는 소리",
  OCEAN_WAVES: "바닷가 파도",
  THUNDERSTORM: "천둥 번개",
  RAIN: "빗소리",
  NIGHT_INSECTS: "밤 귀뚜라미·풀벌레",
  FROGS: "개구리 우는 논",
  STREAM: "시냇물·계곡",
  FOREST_BIRDS: "숲속 새소리",
  HARBOR: "항구·갈매기",
  WIND: "바람 소리",
  CAMPFIRE: "모닥불",
  CAFE: "카페·식당",
  CHEERING: "환호·박수",
  PARTY_CROWD: "사람들 웅성거림",
  CITY_TRAFFIC: "도시 거리·자동차",
  SUBWAY_TRAIN: "지하철·기차",
  AIRPLANE: "공항·비행기",
  KITCHEN: "부엌 요리",
  OFFICE: "사무실 타자 소리",
  CLOCK: "째깍째깍 시계",
  FARM: "시골 농장",
  CHURCH_BELLS: "종소리",
  WIND_CHIME: "풍경 소리",
  FIREWORKS: "불꽃놀이",
  FOOTSTEPS: "걷는 발소리",
  WATER_HOME: "물 흐르는 소리",
  PETS: "강아지·고양이",
  DOOR_KNOCK: "노크·문 소리",
  DOORBELL: "초인종",
  PHONE: "전화벨",
  GLASS_BREAK: "깨지는 소리",
  EXPLOSION: "폭발",
  WHOOSH: "휙 지나가는 소리",
  LAUGHTER: "웃음소리",
  SCREAM: "비명·고함",
  CRYING: "우는 소리",
  GASP_SIGH: "한숨·헉",
  CAMERA: "카메라 셔터",
  SIREN: "사이렌",
  CAR_HORN: "자동차 경적",
  FUNNY: "우스꽝스러운 소리",
  MUSIC_AMBIENT: "잔잔한 앰비언트",
  MUSIC_SOUNDTRACK: "영화 같은 음악",
  MUSIC_PIANO: "피아노",
  MUSIC_CLASSICAL: "클래식",
  MUSIC_JAZZ: "재즈",
  MUSIC_CHIPTUNE: "게임 음악(8비트)",
  MUSIC_ELECTRONIC: "일렉트로닉",
  MUSIC_HIPHOP: "힙합 비트",
  MUSIC_ROCK: "록",
  MUSIC_POP: "팝",
  MUSIC_FOLK: "포크·어쿠스틱",
  MUSIC_WORLD: "세계 음악",
  MUSIC_RETRO: "옛날 음악",
  MUSIC_INSTRUMENTAL: "연주곡",
  MUSIC_EXPERIMENTAL: "실험적인 음악",
};

export const SOUND_MOODS: Record<string, string> = {
  PEACEFUL: "평화로운",
  JOYFUL: "즐거운",
  EXCITING: "신나는",
  PARTY: "파티",
  TENSE: "긴장되는",
  SCARY: "무서운",
  SAD: "슬픈",
  SOLEMN: "엄숙한",
  MYSTERIOUS: "신비로운",
  EPIC: "웅장한",
  ROMANTIC: "로맨틱한",
  COMIC: "코믹한",
  LONELY: "쓸쓸한",
  NOSTALGIC: "그리운",
};

export const LICENSE_LABELS: Record<string, string> = {
  "CC0-1.0": "CC0 1.0 (퍼블릭 도메인)",
  "CC-BY-2.0": "CC BY 2.0",
  "CC-BY-2.5": "CC BY 2.5",
  "CC-BY-3.0": "CC BY 3.0",
  "CC-BY-4.0": "CC BY 4.0",
};

export function categoryLabel(code: string): string {
  return SOUND_CATEGORIES[code] ?? code;
}

export function moodLabel(code: string): string {
  return SOUND_MOODS[code] ?? code;
}

/** 12000 → "0:12" */
export function durationLabel(ms: number): string {
  const s = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** 둘러보기 조건. 빈 값은 거르지 않는다. */
export type SoundFilter = {
  kind: SoundKind | "";
  category: string;
  mood: string;
  q: string;
};

export const DEFAULT_SOUND_FILTER: SoundFilter = {
  kind: "",
  category: "",
  mood: "",
  q: "",
};

const CODE = /^[A-Z_]{1,30}$/;

/** 주소 쿼리 → 조건. 모르는 값은 버린다. */
export function parseSoundFilter(
  query: Record<string, string | string[] | undefined>,
): SoundFilter {
  const one = (k: string) => {
    const v = query[k];
    return (Array.isArray(v) ? v[0] : v)?.slice(0, 50) ?? "";
  };
  const kind = SOUND_KINDS.find((k) => k.value === one("kind"))?.value ?? "";
  const category = CODE.test(one("category")) ? one("category") : "";
  const mood = CODE.test(one("mood")) ? one("mood") : "";
  return { kind, category, mood, q: one("q") };
}

function params(f: SoundFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.kind) p.set("kind", f.kind);
  if (f.category) p.set("category", f.category);
  if (f.mood) p.set("mood", f.mood);
  if (f.q.trim()) p.set("q", f.q.trim());
  return p;
}

/** 조건 → 화면 주소 쿼리. */
export function soundFilterQuery(f: SoundFilter): string {
  const s = params(f).toString();
  return s ? `?${s}` : "";
}

/** 조건 → API 경로. */
export function soundApiPath(f: SoundFilter, size = 30): string {
  const p = params(f);
  p.set("size", String(size));
  return `/sounds?${p.toString()}`;
}

/** 미리 듣기 MP3 (BFF가 권한 확인 뒤 저장소에서 받아 넘긴다). */
export function soundAudioUrl(id: string): string {
  return `/api/images/sounds/${id}`;
}
