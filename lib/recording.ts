import { api, request } from "./api";
import type { Concept } from "./types";

/** 조각 하나의 최대 크기. Ingress 요청 크기 제한(1MB)보다 작게 자른다. */
export const PART_BYTES = 900_000;

/** 최대 조각 수(conversation-service MAX_CHUNKS). */
export const MAX_PARTS = 60;

/** 녹음 최대 길이 1시간. */
export const MAX_RECORDING_SEC = 60 * 60;

const RECORDER_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

/** 이 브라우저의 MediaRecorder가 지원하는 형식. Safari는 mp4. */
export function pickMimeType(
  supports: (type: string) => boolean = (t) => MediaRecorder.isTypeSupported(t),
): string | undefined {
  return RECORDER_TYPES.find((t) => supports(t));
}

const EXTENSION_TYPES: Record<string, string> = {
  m4a: "audio/x-m4a",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  aac: "audio/aac",
  mp4: "audio/mp4",
};

/** 올릴 파일의 오디오 형식. 지원하지 않으면 undefined. */
export function fileContentType(file: {
  name: string;
  type: string;
}): string | undefined {
  if (file.type.startsWith("audio/")) {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext];
}

/** 바이트를 PART_BYTES 이하로 자른다. 서버가 순서대로 이어 붙이므로 아무 데서나 잘라도 된다. */
export function splitBlob(blob: Blob, size = PART_BYTES): Blob[] {
  const parts: Blob[] = [];
  for (let start = 0; start < blob.size; start += size) {
    parts.push(blob.slice(start, start + size));
  }
  return parts;
}

export function uploadPart(
  id: string,
  index: number,
  part: Blob,
  contentType: string,
) {
  return request<void>(`/api/uploads/${id}/${index}`, {
    method: "PUT",
    raw: part,
    contentType,
  });
}

/** 녹음 조각을 들어온 순서대로 하나씩 올린다. 실패하면 이후 조각은 올리지 않고 finish()가 실패한다. */
export class PartQueue {
  private next = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly id: string,
    private readonly contentType: string,
    private readonly upload = uploadPart,
  ) {}

  add(blob: Blob): void {
    for (const part of splitBlob(blob)) {
      const index = this.next++;
      this.chain = this.chain.then(() =>
        this.upload(this.id, index, part, this.contentType),
      );
    }
  }

  get count(): number {
    return this.next;
  }

  /** 모두 올라가면 처리를 시작한다. */
  async finish(): Promise<void> {
    await this.chain;
    if (this.next === 0) {
      throw new Error("녹음된 소리가 없어요.");
    }
    await api.post(`/conversations/${this.id}/finish`, {
      chunkCount: this.next,
    });
  }
}

/** 만들기 화면에서 고르는 그림체. 첫 항목(자동)이 기본값이다. */
export const CONCEPTS: { value: Concept; label: string }[] = [
  { value: "AUTO", label: "자동(추천)" },
  { value: "DAILY", label: "일상 웹툰" },
  { value: "ANIMALS", label: "동물 친구들" },
  { value: "WATERCOLOR", label: "수채화 애니메이션" },
  { value: "PICTURE_BOOK", label: "어린이 그림책" },
  { value: "NEWSPAPER", label: "흑백 신문 4컷" },
  { value: "JOSEON", label: "조선시대 사람들" },
  { value: "WUXIA", label: "무협" },
];

export async function startConversation(
  source: "RECORDING" | "UPLOAD",
  concept: Concept = "AUTO",
): Promise<string> {
  // AUTO는 보내지 않는다(없으면 자동). 그림체를 모르는 예전 서버와도 그대로 맞는다.
  const created = await api.post<{ id: string }>("/conversations", {
    source,
    consent: true,
    ...(concept === "AUTO" ? {} : { concept }),
  });
  return created.id;
}
