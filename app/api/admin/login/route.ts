// POST /api/admin/login — 비밀번호를 확인하고 세션 쿠키를 발급한다 (명세 5.3)
//
// 요청: { "password": "..." }
// 응답: 204 + Set-Cookie admin_session=<토큰>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200
//       401 { error: "WRONG_PASSWORD" }
//       400 { error: "INVALID_BODY" }  ← JSON 이 아닐 때. visit API 와 같은 처리(명세 5.1 미기재, 미결)

// 1. request.json() 실패 → 400 INVALID_BODY
// 2. body.password 가 문자열이 아니면 "" 로 본다
// 3. 환경변수 ADMIN_PASSWORD, ADMIN_SESSION_SECRET 을 읽는다 (비면 오류 → 500)
// 4. isPasswordCorrect(입력, ADMIN_PASSWORD) 가 false → 401 WRONG_PASSWORD
//    - 틀린 횟수 제한은 두지 않는다 (행사 하루, 공용 비밀번호 1개. 명세 범위 밖)
// 5. 맞으면 createSessionToken(비밀키, 현재 시각(초)) 로 토큰을 만든다
// 6. new NextResponse(null, { status: 204 }) 를 만들고 response.cookies.set(...) 으로 쿠키를 붙인다
//    - httpOnly: true (JS 에서 못 읽음), sameSite: "lax", path: "/", maxAge: 43200
//    - secure: 운영(https)에서는 true. localhost 는 http 라서 false 여야 쿠키가 저장된다.
//      → process.env.NODE_ENV === "production" 으로 나눈다
// 7. 응답 본문은 없다 (204)
