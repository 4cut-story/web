import { afterEach, describe, expect, it, vi } from "vitest";

import {
  api,
  ApiError,
  errorMessage,
  imageUrl,
  navigation,
  request,
} from "./api";
import { needsLogin } from "./auth-gate";
import { clock, timeAgo } from "./format";
import {
  fileContentType,
  PartQueue,
  pickMimeType,
  splitBlob,
  startConversation,
} from "./recording";
import { json, mockFetch, noContent } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("API 호출", () => {
  it("JSON을 보내고 받는다", async () => {
    const calls = mockFetch({
      "POST /api/v1/posts": json({ postId: "p1" }, 201),
    });
    expect(await api.post("/posts", { comicId: "c" })).toEqual({
      postId: "p1",
    });
    expect(calls[0].init?.body).toBe('{"comicId":"c"}');
  });

  it("204와 빈 본문은 undefined", async () => {
    mockFetch({
      "PUT /api/v1/x": noContent(),
      "DELETE /api/v1/x": new Response("", { status: 200 }),
    });
    expect(await api.put("/x")).toBeUndefined();
    expect(await api.del("/x")).toBeUndefined();
  });

  it("오류 본문의 코드와 문구를 ApiError로 던진다", async () => {
    mockFetch({
      "GET /api/v1/x": json(
        { error: { code: "NOT_FOUND", message: "없어요" } },
        404,
      ),
    });
    const error = await api.get("/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "없어요",
    });
    expect(errorMessage(error)).toBe("없어요");
    expect(errorMessage(new Error("x"))).toContain("잠시 문제가");
  });

  it("오류 본문이 JSON이 아니어도 기본 문구로 던진다", async () => {
    mockFetch({
      "GET /api/v1/x": new Response("bad gateway", { status: 502 }),
    });
    await expect(api.get("/x")).rejects.toMatchObject({ code: "UNKNOWN" });
  });

  it("401이면 로그인 화면으로 보낸다", async () => {
    const toLogin = vi
      .spyOn(navigation, "toLogin")
      .mockImplementation(() => undefined);
    mockFetch({ "GET /api/v1/me": json({}, 401) });
    await expect(api.get("/me")).rejects.toBeInstanceOf(ApiError);
    expect(toLogin).toHaveBeenCalled();
  });

  it("바이트 본문은 지정한 형식으로 보낸다", async () => {
    const calls = mockFetch({ "PUT /up": noContent() });
    await request("/up", { method: "PUT", raw: "abc" });
    expect(
      (calls[0].init?.headers as Record<string, string>)["Content-Type"],
    ).toBe("application/octet-stream");
  });

  it("이미지 주소", () => {
    expect(imageUrl("posts", "p1")).toBe("/api/images/posts/p1");
    expect(imageUrl("comics", "c1", true)).toBe(
      "/api/images/comics/c1?size=thumb",
    );
  });
});

describe("로그인 확인 (FR 로그인)", () => {
  it("세션이 없으면 화면은 로그인으로, 공개 경로와 파일은 그대로", () => {
    expect(needsLogin("/", false)).toBe(true);
    expect(needsLogin("/posts/1", false)).toBe(true);
    expect(needsLogin("/", true)).toBe(false);
    expect(needsLogin("/login", false)).toBe(false);
    expect(needsLogin("/auth/complete", false)).toBe(false);
    expect(needsLogin("/favicon.ico", false)).toBe(false);
    expect(needsLogin("/logo.svg", false)).toBe(false);
  });
});

describe("시간 표시", () => {
  const now = new Date("2026-10-31T12:00:00Z");
  it("한국어 상대 시간", () => {
    expect(timeAgo("2026-10-31T11:59:30Z", now)).toBe("방금 전");
    expect(timeAgo("2026-10-31T11:57:00Z", now)).toBe("3분 전");
    expect(timeAgo("2026-10-31T09:00:00Z", now)).toBe("3시간 전");
    expect(timeAgo("2026-10-30T12:00:00Z", now)).toBe("어제");
  });
  it("경과 시간", () => {
    expect(clock(205)).toBe("03:25");
    expect(clock(3723)).toBe("1:02:03");
    expect(clock(-5)).toBe("00:00");
  });
});

describe("녹음 올리기 (FR-001, FR-002)", () => {
  it("브라우저가 지원하는 녹음 형식을 고른다", () => {
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
    expect(pickMimeType(() => false)).toBeUndefined();
  });

  it("파일 형식은 MIME이나 확장자로 정한다", () => {
    expect(fileContentType({ name: "a.bin", type: "audio/mpeg" })).toBe(
      "audio/mpeg",
    );
    expect(fileContentType({ name: "voice.M4A", type: "" })).toBe(
      "audio/x-m4a",
    );
    expect(
      fileContentType({ name: "doc.pdf", type: "application/pdf" }),
    ).toBeUndefined();
    expect(fileContentType({ name: "noext", type: "" })).toBeUndefined();
  });

  it("큰 바이트는 1MB 미만 조각으로 자른다", () => {
    const parts = splitBlob(new Blob([new Uint8Array(2_000_000)]));
    expect(parts.map((p) => p.size)).toEqual([900_000, 900_000, 200_000]);
  });

  it("조각을 순서대로 올리고 개수와 함께 끝낸다", async () => {
    const calls = mockFetch({
      "POST /api/v1/conversations/c1/finish": json({ status: "QUEUED" }, 202),
    });
    const uploaded: number[] = [];
    const queue = new PartQueue("c1", "audio/webm", async (_id, index) => {
      uploaded.push(index);
    });
    queue.add(new Blob([new Uint8Array(1_000_000)]));
    queue.add(new Blob([new Uint8Array(10)]));
    expect(queue.count).toBe(3);
    await queue.finish();
    expect(uploaded).toEqual([0, 1, 2]);
    expect(calls[0].init?.body).toBe('{"chunkCount":3}');
  });

  it("조각이 없으면 끝낼 수 없고, 기본 업로드는 web 중계 주소로 보낸다", async () => {
    await expect(new PartQueue("c1", "audio/webm").finish()).rejects.toThrow();
    const calls = mockFetch({
      "PUT /api/uploads/c2/0": noContent(),
      "POST /api/v1/conversations/c2/finish": json({}, 202),
      "POST /api/v1/conversations": json({ id: "c2" }, 201),
    });
    const queue = new PartQueue(
      await startConversation("UPLOAD"),
      "audio/mpeg",
    );
    queue.add(new Blob(["abc"]));
    await queue.finish();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      "POST /api/v1/conversations",
      "PUT /api/uploads/c2/0",
      "POST /api/v1/conversations/c2/finish",
    ]);
  });
});
