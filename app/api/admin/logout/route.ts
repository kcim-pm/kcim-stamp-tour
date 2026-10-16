import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/admin/logout — 세션 쿠키를 지운다 (명세 5.3)
// 응답: 204. 쿠키가 원래 없어도 204. 누구든 자기 쿠키를 지울 수 있으므로 로그인 검증은 하지 않는다.
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  // 발급할 때와 같은 path 여야 같은 쿠키로 인식한다.
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
