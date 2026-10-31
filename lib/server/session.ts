import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { sessionSecret } from "./config";

/** 브라우저에는 이 쿠키 하나만 둔다. 안에는 토큰 쌍이 암호화돼 들어 있다 (브라우저 JS는 토큰을 볼 수 없다). */
export const SESSION_COOKIE = "fourcut_session";

/** 세션 유지 기간 (refresh token과 같게 둔다). */
export const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

export type Session = {
  accessToken: string;
  refreshToken: string;
};

export type TokenPair = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

function key(): Buffer {
  return createHash("sha256").update(sessionSecret()).digest();
}

export function sealSession(session: Session): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(
      JSON.stringify([session.accessToken, session.refreshToken]),
      "utf8",
    ),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** 위조되었거나 키가 바뀌어 풀 수 없으면 null. */
export function openSession(value: string | undefined): Session | null {
  if (!value) {
    return null;
  }
  try {
    const raw = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      raw.subarray(0, 12),
    );
    decipher.setAuthTag(raw.subarray(12, 28));
    const text = Buffer.concat([
      decipher.update(raw.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
    const [accessToken, refreshToken] = JSON.parse(text) as [string, string];
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export function fromTokens(pair: TokenPair): Session {
  return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
}

type CookieJar = {
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      maxAge: number;
    },
  ): unknown;
};

/** 응답에 세션 쿠키를 싣는다. null이면 지운다. */
export function writeSession(
  cookies: CookieJar,
  session: Session | null,
): void {
  cookies.set(SESSION_COOKIE, session ? sealSession(session) : "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: session ? SESSION_MAX_AGE_SEC : 0,
  });
}
