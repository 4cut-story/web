`docs`의 constitution을 상위 원칙으로 따른다: https://github.com/4cut-story/docs/blob/main/.specify/memory/constitution.md

# web Constitution

## 이 레포의 범위
화면(SSR)과 BFF. 쿠키 세션 ↔ JWT, 게이트웨이 호출, 이미지 권한 확인 후 중계. 외부에 열리는 유일한 서비스. React + Next.js (App Router), TypeScript.

## 레포 원칙
- 상위 원칙과 충돌하면 상위 원칙을 따른다. 이 문서에는 이 레포에만 해당하는 규칙만 더한다.
- 다른 서비스와는 `common/contracts`의 태그된 계약대로만 통신한다.
- 테스트 없는 코드는 머지하지 않는다 (상위 원칙 V).
- 녹음과 전사 텍스트는 커밋하지 않는다.

**Version**: 0.1.0 | **Ratified**: 2026-10-31 | **Last Amended**: 2026-10-31
