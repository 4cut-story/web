import { ApiError } from "./api";
import { startConversation, PartQueue } from "./recording";
import type { Concept, Dialect } from "./types";

/**
 * 데모용 샘플 대화. 직접 쓴 가상 대본을 음성 합성(TTS)으로 읽힌 것이라 실제 사람의 녹음이 아니다.
 * 파일은 public/samples/에 두고, 고르면 브라우저가 받아서 녹음 파일 올리기와 같은 길로 보낸다.
 */
export type Sample = {
  id: string;
  title: string;
  topic: string;
  speakers: number;
  durationSec: number;
  summary: string;
};

export const SAMPLES: Sample[] = [
  {
    id: "camping",
    title: "주말 캠핑 계획",
    topic: "친구",
    speakers: 3,
    durationSec: 387,
    summary:
      "친구 셋이 가평 계곡 캠핑을 계획한다. 늦잠 대장의 여섯 시 출발 약속, 냄비를 태운 전적이 있는 친구의 통닭 통구이 도전과 설거지 내기, 화장실이 먼 마지막 남은 자리 예약까지.",
  },
  {
    id: "grandma",
    title: "할머니 팔순 잔치",
    topic: "가족",
    speakers: 4,
    durationSec: 348,
    summary:
      "저녁 식탁에서 가족 넷이 할머니 팔순을 준비한다. 죽이 됐던 잡채 재도전, 결혼사진 현수막, 비행기도 배도 어려워 고른 강릉 기차 여행, 목욕탕 작전으로 하는 깜짝 파티.",
  },
  {
    id: "office",
    title: "발표 날 점심 메뉴",
    topic: "회사",
    speakers: 3,
    durationSec: 193,
    summary:
      "사장님 앞 발표를 앞둔 팀이 점심 메뉴로 티격태격한다. 버튼을 백 번 눌러 고친 동료, 강아지 셋을 키우는 사장님을 위한 시연 사진, 발표가 잘 끝나면 쏘겠다는 팀장님의 약속.",
  },
  {
    id: "festival",
    title: "동아리 축제 부스 회의",
    topic: "학교",
    speakers: 4,
    durationSec: 445,
    summary:
      "떡볶이를 요리 동아리에 뺏긴 대학 동아리가 '시험 기간 탈출하기' 방탈출과 네 컷 사진관을 합친 부스를 기획한다. 가방에서 나온 리모컨, 빨아 버린 영수증, 힌트 카드 장사까지.",
  },
];

export function sampleUrl(sample: Sample): string {
  return `/samples/${sample.id}.mp3`;
}

/** 샘플 음성을 받아 대화를 만들고 올린다. 만든 대화 id를 돌려준다. */
export async function startSample(
  sample: Sample,
  concept: Concept,
  dialect: Dialect = "NONE",
): Promise<string> {
  const res = await fetch(sampleUrl(sample));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      "SAMPLE_UNAVAILABLE",
      "샘플을 불러오지 못했어요. 잠시 후 다시 해 주세요.",
    );
  }
  const audio = await res.blob();
  const id = await startConversation("UPLOAD", concept, dialect);
  const queue = new PartQueue(id, "audio/mpeg");
  queue.add(audio);
  await queue.finish();
  return id;
}
