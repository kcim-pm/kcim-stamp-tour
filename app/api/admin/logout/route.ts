// POST /api/admin/logout — 세션 쿠키를 지운다 (명세 5.3)
//
// 응답: 204. 쿠키가 원래 없어도 204 (실패할 이유가 없다)

// 1. new NextResponse(null, { status: 204 })
// 2. response.cookies.set("admin_session", "", { maxAge: 0, path: "/" }) 로 브라우저가 쿠키를 버리게 한다
//    - 발급할 때와 같은 path 여야 같은 쿠키로 인식한다
// 3. 로그인 검증은 하지 않는다. 누구든 자기 쿠키를 지울 수 있다
