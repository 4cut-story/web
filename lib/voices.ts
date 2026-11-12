import data from "./voices-data.json";

/**
 * 가상 인물 목소리(/voices). 실제 사람 녹음 없이 Qwen3-TTS VoiceDesign이 글 설명만으로 만든 목소리를
 * 감정별 참조 음성으로 저장해 두고, 라이브 모드 대사는 CosyVoice3가 그 참조를 따라 읽는다.
 * 음성 파일은 public/voices/{id}/{emotion}.mp3(v4로 읽힌 대사), 목록은 voices-data.json에 둔다.
 */
export type VoiceGender = "male" | "female";
export type VoiceAge = "CHILD" | "YOUNG" | "MIDDLE" | "OLD";
export type VoiceDialect =
  "GYEONGSANG" | "JEOLLA" | "CHUNGCHEONG" | "GANGWON" | "JEJU";
export type VoiceEmotion = "neutral" | "happy" | "angry" | "sad" | "surprised";

export type VoiceSample = { text: string; durationMs: number };

export type Voice = {
  id: string;
  name: string;
  gender: VoiceGender;
  ageGroup: VoiceAge;
  dialect: VoiceDialect | null;
  tone: string;
  description: string;
  /** 특징 낱말(높낮이·빠르기·음색·성격). 임베딩 검색 문장의 바탕이다. */
  traits?: string[];
  /** 콘티 인물 설명과 BGE-M3 임베딩으로 견줄 한 문장. */
  searchText?: string;
  samples: Partial<Record<VoiceEmotion, VoiceSample>>;
};

export const VOICES: Voice[] = data as Voice[];

export const GENDER_LABELS: Record<VoiceGender, string> = {
  female: "여성",
  male: "남성",
};

/** 캐릭터 DB의 연령대 코드(conversation-service ageGroup)와 같은 순서. */
export const AGE_LABELS: Record<VoiceAge, string> = {
  CHILD: "어린이",
  YOUNG: "청년",
  MIDDLE: "중년",
  OLD: "노년",
};

export const DIALECT_LABELS: Record<VoiceDialect, string> = {
  GYEONGSANG: "경상도",
  JEOLLA: "전라도",
  CHUNGCHEONG: "충청도",
  GANGWON: "강원도",
  JEJU: "제주",
};

export const EMOTIONS: { value: VoiceEmotion; label: string }[] = [
  { value: "neutral", label: "기본" },
  { value: "happy", label: "기쁨" },
  { value: "angry", label: "화남" },
  { value: "sad", label: "슬픔" },
  { value: "surprised", label: "놀람" },
];

const AGE_ORDER: VoiceAge[] = ["CHILD", "YOUNG", "MIDDLE", "OLD"];

export function voiceAudioUrl(id: string, emotion: VoiceEmotion): string {
  return `/voices/${encodeURIComponent(id)}/${emotion}.mp3`;
}

/**
 * 성별로 거른 뒤 표준어 인물은 연령대별로, 사투리 인물은 따로 한 묶음으로 나눈다. 빈 묶음은 뺀다.
 */
export function groupVoices(
  voices: Voice[],
  gender: VoiceGender | "",
): { title: string; voices: Voice[] }[] {
  const picked = voices.filter((v) => !gender || v.gender === gender);
  const groups = AGE_ORDER.map((age) => ({
    title: AGE_LABELS[age],
    voices: picked.filter((v) => !v.dialect && v.ageGroup === age),
  }));
  groups.push({
    title: "사투리",
    voices: picked.filter((v) => v.dialect),
  });
  return groups.filter((g) => g.voices.length > 0);
}
