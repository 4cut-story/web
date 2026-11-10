import type { Conversation, ConversationStatus } from "@/lib/types";

/** 내 프로필의 만드는 현황 묶음. 진행 중(대기 포함), 완료, 못 만듦(실패·장면 없음). */
export type StatusGroup = "active" | "done" | "failed";

const DONE: ConversationStatus[] = ["DONE"];
const FAILED: ConversationStatus[] = ["FAILED", "NO_SCENE"];

export function statusGroup(c: Pick<Conversation, "status">): StatusGroup {
  if (DONE.includes(c.status)) {
    return "done";
  }
  if (FAILED.includes(c.status)) {
    return "failed";
  }
  return "active";
}

/** 지금 상태를 한 줄로. 기사는 받아쓰기 대신 기사 읽기다. */
export function statusLabel(
  c: Pick<Conversation, "status" | "source">,
): string {
  const article = c.source === "ARTICLE";
  switch (c.status) {
    case "RECORDING":
      return "녹음 중";
    case "QUEUED":
      return "차례를 기다리는 중";
    case "TRANSCRIBING":
      return article ? "기사 읽는 중" : "대화 듣는 중";
    case "SELECTING":
      return "장면 고르는 중";
    case "SCRIPTING":
      return "대사 쓰는 중";
    case "DRAWING":
      return "그리는 중";
    case "SPEAKING":
      return "목소리 입히는 중";
    case "COMPOSING":
      return "말풍선 넣는 중";
    case "GPU_WAITING":
      return "그림 컴퓨터를 기다리는 중";
    case "DONE":
      return "완성";
    case "NO_SCENE":
      return "장면을 찾지 못함";
    case "FAILED":
      return "만들지 못함";
    default:
      return c.status;
  }
}

/** 무엇으로 만들었는지. */
export function sourceLabel(c: Pick<Conversation, "source">): string {
  switch (c.source) {
    case "ARTICLE":
      return "기사";
    case "UPLOAD":
      return "녹음 파일";
    default:
      return "녹음";
  }
}

/** 눌렀을 때 갈 곳. 완성된 만화는 만화로, 나머지는 진행 화면으로. */
export function statusHref(
  c: Pick<Conversation, "id" | "status" | "comicId">,
): string {
  return c.status === "DONE" && c.comicId
    ? `/comics/${c.comicId}`
    : `/conversations/${c.id}`;
}

export function countGroups(
  items: Pick<Conversation, "status">[],
): Record<StatusGroup, number> {
  const counts: Record<StatusGroup, number> = { active: 0, done: 0, failed: 0 };
  for (const c of items) {
    counts[statusGroup(c)] += 1;
  }
  return counts;
}

/**
 * 목록에 보일 제목. 완성된 만화 제목 → 기사 제목 → 상태에 맞는 안내 순서.
 * 만든 방법(녹음·기사)은 제목이 아니라 작은 라벨로 따로 보인다.
 */
export function itemTitle(
  c: Pick<Conversation, "status" | "sourceTitle">,
  comicTitle?: string,
): { text: string; placeholder: boolean } {
  const title = comicTitle?.trim() || c.sourceTitle?.trim();
  if (title) {
    return { text: title, placeholder: false };
  }
  const group = statusGroup(c);
  return {
    text:
      group === "active"
        ? "제목은 완성되면 붙어요"
        : group === "done"
          ? "제목 없는 4컷"
          : "만들지 못한 4컷",
    placeholder: true,
  };
}
