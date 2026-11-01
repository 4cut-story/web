/** 브라우저에서 web BFF(/api/v1/**)를 부른다. 토큰은 서버 쿠키 세션에만 있다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const FALLBACK_MESSAGE = "잠시 문제가 생겼어요. 조금 뒤 다시 해 주세요.";

async function toError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string };
    };
    return new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? FALLBACK_MESSAGE,
    );
  } catch {
    return new ApiError(response.status, "UNKNOWN", FALLBACK_MESSAGE);
  }
}

/** 로그인이 풀렸을 때 로그인 화면으로 보낸다. 테스트에서 바꿔 끼운다. */
export const navigation = {
  toLogin: () =>
    window.location.assign(new URL("/login", window.location.origin)),
};

export async function request<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    raw?: BodyInit;
    contentType?: string;
    /** true면 401이어도 로그인 화면으로 보내지 않는다 (로그인 없이 보는 화면). */
    quiet?: boolean;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init.raw !== undefined) {
    body = init.raw;
    headers["Content-Type"] = init.contentType ?? "application/octet-stream";
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(path, {
    method: init.method ?? "GET",
    headers,
    body,
  });
  if (response.status === 401 && !init.quiet) {
    navigation.toLogin();
  }
  if (!response.ok) {
    throw await toError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(`/api/v1${path}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(`/api/v1${path}`, { method: "POST", body: body ?? {} }),
  put: <T>(path: string) => request<T>(`/api/v1${path}`, { method: "PUT" }),
  del: <T>(path: string) => request<T>(`/api/v1${path}`, { method: "DELETE" }),
  /** 로그인하지 않았으면(401) null. 로그인 화면으로 보내지 않는다. */
  getIfSignedIn: async <T>(path: string): Promise<T | null> => {
    try {
      return await request<T>(`/api/v1${path}`, { quiet: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        return null;
      }
      throw e;
    }
  },
};

/** 사용자 페이지 주소. 블로그처럼 /@닉네임 (닉네임은 회원마다 고유하다). */
export function userPath(nickname: string): string {
  return `/@${encodeURIComponent(nickname)}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}

export function imageUrl(
  kind: "posts" | "comics",
  id: string,
  thumb = false,
): string {
  return `/api/images/${kind}/${id}${thumb ? "?size=thumb" : ""}`;
}
