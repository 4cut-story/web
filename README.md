# web

화면(SSR)과 BFF. 쿠키 세션 ↔ JWT, 게이트웨이 호출, 이미지 권한 확인 후 중계. 외부에 열리는 유일한 서비스. React + Next.js (App Router), TypeScript.

- 기술: Node.js LTS, React + Next.js, TypeScript, Vitest + Testing Library, MSW, Playwright. 브라우저 번들에 게이트웨이 주소가 들어가면 안 된다.
- 설계와 스펙: [docs](https://github.com/4cut-story/docs)
