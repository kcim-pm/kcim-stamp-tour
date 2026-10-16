import { describe, it, expect } from "vitest";
import {
  SESSION_MAX_AGE,
  createSessionToken,
  isPasswordCorrect,
  safeNextPath,
  verifySessionToken,
} from "../lib/auth";

// 시각은 고정값을 넣는다. Date.now() 를 쓰지 않는다.
const NOW = 1_760_000_000;
const SECRET_A = "test-secret-a-0123456789abcdefghij";
const SECRET_B = "test-secret-b-0123456789abcdefghij";

describe("세션 토큰", () => {
  it("발급한 토큰을 같은 비밀키로 검증하면 통과한다", () => {
    const token = createSessionToken(SECRET_A, NOW);
    expect(verifySessionToken(token, SECRET_A, NOW)).toBe(true);
  });

  it("다른 비밀키로 검증하면 거부한다 (서명 위조)", () => {
    const token = createSessionToken(SECRET_A, NOW);
    expect(verifySessionToken(token, SECRET_B, NOW)).toBe(false);
  });

  it("토큰의 서명 끝 글자를 바꾸면 거부한다", () => {
    const token = createSessionToken(SECRET_A, NOW);
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "0" ? "1" : "0");
    expect(verifySessionToken(tampered, SECRET_A, NOW)).toBe(false);
  });

  it("토큰의 만료시각을 손으로 늘리면 거부한다 (서명이 안 맞음)", () => {
    const token = createSessionToken(SECRET_A, NOW);
    const [exp, sig] = token.split(".");
    const tampered = `${Number(exp) + 3600}.${sig}`;
    expect(verifySessionToken(tampered, SECRET_A, NOW)).toBe(false);
  });

  it("만료시각이 지나면 거부한다", () => {
    const token = createSessionToken(SECRET_A, NOW);
    expect(verifySessionToken(token, SECRET_A, NOW + SESSION_MAX_AGE + 1)).toBe(false);
  });

  it("만료시각과 같은 순간도 거부한다", () => {
    const token = createSessionToken(SECRET_A, NOW);
    expect(verifySessionToken(token, SECRET_A, NOW + SESSION_MAX_AGE)).toBe(false);
  });

  it("만료 1초 전은 통과한다", () => {
    const token = createSessionToken(SECRET_A, NOW);
    expect(verifySessionToken(token, SECRET_A, NOW + SESSION_MAX_AGE - 1)).toBe(true);
  });

  it.each(["", "abc", "123", ".", "abc.def", "1.2.3"])("형식이 아닌 문자열 %j 는 거부한다", (bad) => {
    expect(verifySessionToken(bad, SECRET_A, NOW)).toBe(false);
  });
});

describe("비밀번호 비교", () => {
  it("같으면 통과한다", () => {
    expect(isPasswordCorrect("correct-horse-battery", "correct-horse-battery")).toBe(true);
  });

  it("한 글자라도 다르면 거부한다", () => {
    expect(isPasswordCorrect("correct-horse-batterx", "correct-horse-battery")).toBe(false);
  });

  it("길이가 다르면 거부한다 (앞부분만 같은 경우 포함)", () => {
    expect(isPasswordCorrect("correct-horse", "correct-horse-battery")).toBe(false);
    expect(isPasswordCorrect("correct-horse-battery-staple", "correct-horse-battery")).toBe(false);
  });

  it("빈 문자열은 거부한다", () => {
    expect(isPasswordCorrect("", "correct-horse-battery")).toBe(false);
  });

  it("한글이 섞여도 같으면 통과한다", () => {
    expect(isPasswordCorrect("비밀번호-2026", "비밀번호-2026")).toBe(true);
  });
});

describe("로그인 뒤 돌아갈 경로", () => {
  it('"/qr" → "/qr"', () => {
    expect(safeNextPath("/qr")).toBe("/qr");
  });

  it('"/admin/draw" → "/admin/draw"', () => {
    expect(safeNextPath("/admin/draw")).toBe("/admin/draw");
  });

  it('외부 주소 "https://evil.com" → "/admin"', () => {
    expect(safeNextPath("https://evil.com")).toBe("/admin");
  });

  it('"//evil.com" → "/admin" (브라우저가 외부 주소로 해석함)', () => {
    expect(safeNextPath("//evil.com")).toBe("/admin");
  });

  it('"/\\evil.com" → "/admin" (브라우저는 역슬래시를 슬래시로 해석해 //evil.com 이 된다)', () => {
    expect(safeNextPath("/\\evil.com")).toBe("/admin");
    expect(safeNextPath("/\\\\evil.com")).toBe("/admin");
  });

  it('값이 없거나 "" → "/admin"', () => {
    expect(safeNextPath(undefined)).toBe("/admin");
    expect(safeNextPath("")).toBe("/admin");
  });
});
