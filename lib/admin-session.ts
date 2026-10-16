import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import { apiError } from "./api-error";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

// lib/admin-session.ts — 쿠키를 읽어 관리자 세션을 확인 (서버 전용, 테스트 대상 아님)
//
// lib/auth.ts(순수 함수)와 Next.js(쿠키·환경변수·redirect) 사이를 잇는 얇은 층.
// status.ts(계산) / status-query.ts(DB 접근) 를 나눈 것과 같은 이유로 나눈다.
// 페이지 3곳(/qr, /admin, /admin/draw)과 관리자 API 가 전부 이 파일을 부른다.

export function requireAdminEnv(name: "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 이(가) 비어 있다. .env.local 또는 Netlify 환경변수를 확인할 것`);
  }
  return value;
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function isAdminLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token, requireAdminEnv("ADMIN_SESSION_SECRET"), nowSeconds());
}

// 서버 컴포넌트 맨 위에서 await 로 한 줄 부른다. 로그인 상태면 그냥 지나간다.
export async function requireAdminPage(currentPath: string): Promise<void> {
  if (!(await isAdminLoggedIn())) {
    redirect(`/admin/login?next=${encodeURIComponent(currentPath)}`);
  }
}

// Route Handler 는 `const denied = await requireAdminApi(); if (denied) return denied;` 로 쓴다.
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAdminLoggedIn()) return null;
  return apiError("UNAUTHORIZED");
}
