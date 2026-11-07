/**
 * 모든 응답에 붙이는 보안 헤더. 앞단 nginx가 HTTPS를 맡으므로 HSTS도 여기서 준다.
 * 녹음 화면이 마이크를 쓰므로 microphone만 같은 사이트에 열고, 카메라·위치는 닫는다.
 */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=()",
  },
];
