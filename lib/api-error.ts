import "server-only";
import { NextResponse } from "next/server";

// lib/api-error.ts — 오류 응답을 한 곳에서 만드는 도우미 (서버 전용)
//
// lib/ 의 규칙 함수들은 규칙에 어긋나면 "DRAW_NOT_PENDING" 같은 코드를 던진다.
// API 마다 코드 → HTTP 상태 표를 복사하지 않도록 짝을 이 파일 한 곳에 둔다. 응답 모양은 spec 5.1 { "error": "코드" }.
//
// 관리자 API 는 같은 틀을 따른다.
//   1. const denied = await requireAdminApi(); if (denied) return denied;
//   2. 본래 할 일을 try 안에서 한다.
//   3. catch 에서는 return toErrorResponse(e, "[POST /api/admin/...]");

// spec 5.1 오류 표
const STATUS_BY_CODE = {
  INVALID_BODY: 400,
  INVALID_PARTICIPANT_NO: 400,
  INVALID_WINNER_COUNT: 400,
  INVALID_IMAGE_URL: 400,
  INVALID_WINNER_SELECTION: 400,
  UNAUTHORIZED: 401,
  WRONG_PASSWORD: 401,
  INVALID_TOKEN: 404,
  DRAW_NOT_FOUND: 404,
  NOT_ENOUGH_CANDIDATES: 409,
  DRAW_PENDING_EXISTS: 409,
  DRAW_NOT_PENDING: 409,
  PRIZE_ALREADY_DRAWN: 409,
  DB_ERROR: 500,
} as const;

export type ApiErrorCode = keyof typeof STATUS_BY_CODE;

function isApiErrorCode(value: string): value is ApiErrorCode {
  return Object.hasOwn(STATUS_BY_CODE, value);
}

export function apiError(code: ApiErrorCode): NextResponse {
  return NextResponse.json({ error: code }, { status: STATUS_BY_CODE[code] });
}

// 규칙 함수가 일부러 던진 코드는 그 코드로 응답한다.
// 그 밖의 오류(DB 실패, 예상하지 못한 버그)는 로그에만 자세히 남기고 DB_ERROR 로만 응답한다.
// 브라우저에 DB 구조나 내부 메시지가 보이지 않게 하려는 것이다.
export function toErrorResponse(e: unknown, logLabel: string): NextResponse {
  if (e instanceof Error && isApiErrorCode(e.message)) return apiError(e.message);
  console.error(logLabel, e);
  return apiError("DB_ERROR");
}
