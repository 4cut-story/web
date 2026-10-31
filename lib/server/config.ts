// 서버(route handler)에서만 import 한다.
/** 서버에서만 읽는 설정. 게이트웨이 주소는 브라우저 번들에 들어가면 안 된다. */
export function gatewayUrl(): string {
  return (process.env.SERVICES_GATEWAY_URL ?? "http://localhost:8080").replace(
    /\/$/,
    "",
  );
}

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET이 없거나 너무 짧습니다 (16자 이상)");
  }
  return "local-dev-session-secret-not-for-production";
}

/** 공개 주소. 리디렉트는 요청 헤더가 아니라 이 값으로 만든다 (앞단 프록시가 scheme을 바꿀 수 있다). */
export function publicUrl(path: string): string {
  const base = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return base + path;
}
