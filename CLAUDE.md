# CLAUDE.md

KCIM BIMlize Con 2026(2026-10-27) 스탬프 투어·경품 추첨 모바일 웹. Next.js(App Router) + Netlify + Supabase.

## 기준 문서

- `docs/spec.md` — 개발 명세. 화면, 데이터 모델, API, 구현 규칙, 테스트. **코드는 이 문서를 따른다.**
- `docs/plan.md` — 기획서. 결정 사항(D-번호), 일정, 운영.
- 두 문서와 코드가 어긋나면 문서를 먼저 고치고 코드를 맞춘다. 문서를 고치면 변경 이력에 한 줄 남긴다.

## 작업 방식

- **TDD.** 규칙은 `lib/` 순수 함수로 두고, 테스트(`tests/`, Vitest)를 먼저 쓴 뒤 구현한다. 대상은 spec.md 8.1 표. Route Handler와 화면은 수동 확인.
- 요구사항 ID(P-xx, A-xx)와 결정 ID(D-xx)를 커밋 메시지와 PR에 적는다.
- 응답과 주석은 한국어.

## 지켜야 할 것

- 브라우저는 DB를 직접 호출하지 않는다. 모든 읽기·쓰기는 `app/api`를 거친다.
- `NEXT_PUBLIC_` 환경변수를 만들지 않는다. Supabase 키는 서버 전용이다.
- 참가번호는 서버에서 1~999 정수로 정규화한다. 화면에는 앞자리 0 없이 표시한다.
- 추첨·재추첨·확정·지급은 spec.md 6장의 상태 규칙을 따른다. 무작위는 서버의 `crypto.randomInt`.
- 참가자 화면에 당첨 여부를 표시하지 않는다.
- 비밀 값은 `.env.local`과 Netlify 환경변수에만 둔다. git에 올리지 않는다.

## 명령

```bash
npm install
npm test
npm run dev
```

## 워크스페이스 규칙

상위 폴더(`Documents/GitHub/`)의 `AGENTS.md`와 `CLAUDE.md`를 따른다. 작업 일지와 커밋은 사용자 승인 뒤에 작성한다.
