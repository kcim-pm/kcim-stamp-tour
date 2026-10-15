import { createHmac, timingSafeEqual } from "node:crypto";

// lib/auth.ts — 관리자 세션 토큰 발급·검증 (순수 함수, 단위 테스트 대상)
//
// DB·쿠키·환경변수를 직접 읽지 않는다. 비밀키와 현재 시각은 전부 인자로 받는다.
// 그래야 테스트에서 시각을 마음대로 넣어 「만료」를 재현할 수 있다.
// Node 내장 crypto 만 쓴다. 새 패키지 없음.

// 쿠키 이름과 수명 12시간(초). 명세 5.3.
export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 43200;

const DEFAULT_NEXT = "/admin";

// 토큰 형식: "<만료시각>.<서명>"
//   만료시각: 유닉스 초(정수). 발급 시각 + 12시간
//   서명:     HMAC-SHA256(만료시각 문자열, 비밀키) 를 hex 로
// 서버만 비밀키를 알므로, 만료시각을 고치면 서명이 안 맞아 위조로 걸린다.
function sign(expiresAt: string, secret: string): string {
  return createHmac("sha256", secret).update(expiresAt).digest("hex");
}

// 길이가 같을 때만 상수 시간으로 비교한다.
// === 로 비교하면 앞글자부터 틀린 자리에서 멈춰 응답 시간이 달라진다.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createSessionToken(secret: string, now: number): string {
  const expiresAt = String(now + SESSION_MAX_AGE);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

// 예외를 던지지 않고 항상 boolean 만 돌려준다. 호출하는 쪽이 if 하나로 끝나게.
export function verifySessionToken(token: string, secret: string, now: number): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresAt, signature] = parts;
  if (!/^\d+$/.test(expiresAt)) return false;

  if (!safeEqual(signature, sign(expiresAt, secret))) return false;

  return Number(expiresAt) > now;
}

// 명세 7.2 「길이가 같을 때만 통과하는 상수 시간 비교」. 빈 입력은 언제나 거부한다.
export function isPasswordCorrect(input: string, expected: string): boolean {
  if (input === "" || expected === "") return false;
  return safeEqual(input, expected);
}

// /admin/login?next=/qr 의 next 를 그대로 redirect 에 쓰면 외부 주소로 보내질 수 있다.
// "/" 로 시작하고 두 번째 글자가 "/" 나 "\" 가 아닐 때만 그대로 쓰고, 아니면 "/admin".
// 브라우저는 "/\evil.com" 을 "//evil.com" 과 같은 외부 주소로 해석하므로 역슬래시도 막는다 (spec 3.6).
export function safeNextPath(raw: string | undefined | null): string {
  if (!raw || !raw.startsWith("/") || /^\/[\/\\]/.test(raw)) return DEFAULT_NEXT;
  return raw;
}
