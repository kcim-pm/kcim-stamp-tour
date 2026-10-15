import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, isPasswordCorrect } from "@/lib/auth";
import { nowSeconds, requireAdminEnv } from "@/lib/admin-session";

// POST /api/admin/login — 비밀번호를 확인하고 세션 쿠키를 발급한다 (명세 5.3)
// 응답: 204 + Set-Cookie / 401 WRONG_PASSWORD / 400 INVALID_BODY (visit API 와 같은 처리)
// 틀린 횟수 제한은 두지 않는다 (행사 하루, 공용 비밀번호 1개. 명세 범위 밖)
export async function POST(request: NextRequest) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const password = typeof body?.password === "string" ? body.password : "";

  // 환경변수가 비어 있으면 requireAdminEnv 가 던지고, Next.js 가 500 으로 돌려준다.
  if (!isPasswordCorrect(password, requireAdminEnv("ADMIN_PASSWORD"))) {
    return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 401 });
  }

  const token = createSessionToken(requireAdminEnv("ADMIN_SESSION_SECRET"), nowSeconds());
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    // localhost 는 http 라서 secure 면 쿠키가 저장되지 않는다.
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
