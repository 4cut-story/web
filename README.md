# web

화면(SSR)과 BFF. 쿠키 세션 ↔ JWT, 게이트웨이 호출, 이미지 권한 확인 후 중계. 외부에 열리는 유일한 서비스. React + Next.js (App Router), TypeScript.

- 기술: Node.js LTS, React + Next.js, TypeScript, Vitest + Testing Library, MSW, Playwright. 브라우저 번들에 게이트웨이 주소가 들어가면 안 된다.
- 설계와 스펙: [docs](https://github.com/4cut-story/docs)

## 구조

- `app/**/page.tsx` — 화면. 실제 화면은 `components/screens/*`의 클라이언트 컴포넌트이고, 데이터는 브라우저에서 web의 `/api/**`로 가져온다.
- `app/auth/**`, `app/api/**` — BFF route handler. 서버 코드는 `lib/server/*`.
  - `/auth/login/{github|google}`, `/auth/callback/{provider}`: auth-service OAuth 로그인을 그대로 중계 (302와 로그인 과정 쿠키 전달)
  - `/auth/complete?code=`: 일회용 코드 → 토큰 → 암호화 세션 쿠키 `fourcut_session` (HttpOnly, SameSite=Lax, 14일)
  - `/api/v1/**`: 게이트웨이 공개 API 중계 (Access Token 만료 시 한 번 갱신)
  - `/api/images/{posts|comics}/{id}`: 권한 확인 뒤 미리 서명된 주소에서 이미지 바이트를 받아 전달
  - `/api/uploads/{conversationId}/{index}`: 녹음 조각(1MB 미만)을 받아 저장소에 PUT
- `proxy.ts` — 세션 쿠키가 없으면 화면 대신 `/login`으로 보낸다.

## 환경 변수

| 이름                   | 설명                                                  |
| ---------------------- | ----------------------------------------------------- |
| `SERVICES_GATEWAY_URL` | api-gateway 주소 (서버에서만 쓴다)                    |
| `PUBLIC_BASE_URL`      | 공개 주소. 리디렉트 기준                              |
| `SESSION_SECRET`       | 세션 쿠키 암호화 키 (16자 이상, k8s `web-properties`) |

## 로컬 실행

```bash
npm ci
SERVICES_GATEWAY_URL=http://localhost:8080 npm run dev
```

auth-service를 `AUTH_DEV_LOGIN_ENABLED=true`로 띄우면 로그인 화면에 개발용 로그인이 나온다.
