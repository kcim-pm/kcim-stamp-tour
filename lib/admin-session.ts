import "server-only";

// lib/admin-session.ts — 쿠키를 읽어 관리자 세션을 확인 (서버 전용, 테스트 대상 아님)
//
// lib/auth.ts(순수 함수)와 Next.js(쿠키·환경변수·redirect) 사이를 잇는 얇은 층.
// status.ts(계산) / status-query.ts(DB 접근) 를 나눈 것과 같은 이유로 나눈다.
// 페이지 3곳(/qr, /admin, /admin/draw)과 관리자 API 8개가 전부 이 파일을 부른다.

// ── 환경변수 ──────────────────────────────────────────
// ADMIN_SESSION_SECRET 을 읽는다. 비어 있으면 변수 이름을 밝히고 오류.
// (supabase-server.ts 의 requireEnv 와 같은 방식)

// ── 함수 1: 로그인 상태인가 ───────────────────────────
// isAdminLoggedIn() → Promise<boolean>
//   1. cookies() 에서 "admin_session" 을 읽는다. 없으면 false
//   2. verifySessionToken(값, 비밀키, 현재 시각(초)) 결과를 돌려준다

// ── 함수 2: 페이지 보호 ───────────────────────────────
// requireAdminPage(currentPath)
//   로그인 상태가 아니면 redirect("/admin/login?next=" + encodeURIComponent(currentPath))
//   로그인 상태면 아무것도 하지 않고 지나간다.
//   서버 컴포넌트 맨 위에서 await 로 한 줄 부른다.

// ── 함수 3: API 보호 ──────────────────────────────────
// requireAdminApi() → Promise<NextResponse | null>
//   로그인 상태가 아니면 401 { error: "UNAUTHORIZED" } 응답을 돌려준다.
//   로그인 상태면 null. Route Handler 는 `if (denied) return denied;` 한 줄로 쓴다.
//   (내일 작업 7번의 관리자 API 8개가 쓴다. 오늘은 만들어만 둔다)
