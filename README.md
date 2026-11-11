# web

**4cut story의 화면과 BFF. 외부에 열린 유일한 서비스예요.**

[← 4cut story 소개](https://github.com/4cut-story) · [데모](https://4cut.java21.net) · [소개 페이지](https://4cut.java21.net/about) · [아키텍처](https://github.com/4cut-story/.github/blob/main/docs/architecture.md)

## 하는 일

- 녹음, 기사 주소, RSS 구독으로 4컷을 만드는 화면과 내 스토리, 피드, 프로필 화면
- 브라우저의 암호화 세션 쿠키를 백엔드용 JWT로 바꿔 api-gateway에 전달 (BFF)
- GitHub·Google 로그인 과정을 auth-service로 중계
- 이미지는 권한을 확인한 뒤 저장소에서 받아 전달하고, 녹음 조각은 받아서 저장소에 올림
- 서비스 소개 페이지(`/about`). 내용의 원본은 `lib/about.ts`

## 시스템 안에서의 위치

```
브라우저 ──HTTPS──> web ──JWT──> api-gateway ──> auth / conversation / content
```

브라우저는 web만 알아요. 게이트웨이 주소는 서버 코드에서만 쓰고 브라우저 번들에는 넣지 않아요.

## 기술

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Vitest · Testing Library · MSW · Playwright

## 실행

```bash
npm ci
SERVICES_GATEWAY_URL=http://localhost:8080 npm run dev
```

auth-service를 `AUTH_DEV_LOGIN_ENABLED=true`로 띄우면 로그인 화면에 개발용 로그인이 나와요. 필요한 환경 변수는 [BFF 문서](docs/bff.md#환경-변수)에 있어요.

## 검사

```bash
npm run lint && npm run typecheck && npm run format:check && npm run dup:check && npm run test:coverage && npm run build
```

PR과 main push마다 CI가 같은 검사를 돌려요(커버리지 80% 이상). main에 머지되면 이미지가 GHCR에 올라가고 Argo CD가 배포해요.

## 자세한 문서

| 문서                                                                             | 내용                                                            |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [BFF 구조](docs/bff.md)                                                          | 화면과 route handler 구성, 로그인·이미지·업로드 경로, 환경 변수 |
| [아키텍처](https://github.com/4cut-story/.github/blob/main/docs/architecture.md) | 서비스별 역할과 통신 방식, 로그인·배포 흐름                     |
| [생성 흐름](https://github.com/4cut-story/.github/blob/main/docs/pipeline.md)    | 녹음·기사에서 4컷까지 단계별 규칙                               |
| [설계 문서](https://github.com/4cut-story/docs)                                  | 디자인 시스템, API 규칙, 기능 스펙                              |
