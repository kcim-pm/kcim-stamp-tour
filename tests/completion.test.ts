import { describe, it, expect } from "vitest";
import { isCompleted } from "../lib/completion";

describe("완주 판정", () => {
  it("방문 구역 수가 전체 구역 수와 같으면 완주다", () => {
    expect(isCompleted(5, 5)).toBe(true);
  });

  it.each([
    [4, 5],
    [0, 5],
  ])("방문 %i곳 / 전체 %i곳은 완주가 아니다", (visited, total) => {
    expect(isCompleted(visited, total)).toBe(false);
  });

  it("전체 구역이 0곳이면 완주가 아니다", () => {
    // 구역 데이터가 비어 있는 비정상 상태를 완주로 보지 않는다
    expect(isCompleted(0, 0)).toBe(false);
  });

  it("방문 수가 전체 수보다 많아도 완주가 아니다", () => {
    expect(isCompleted(6, 5)).toBe(false);
  });
});
