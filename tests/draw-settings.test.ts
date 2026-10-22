import { describe, it, expect } from "vitest";
import { DEFAULT_DRAW_SETTINGS, parseDrawSettings } from "../lib/draw-settings";

// 추첨 설정 (spec 3.3 「추첨 설정」, 이슈 #4). 관리자 콘솔이 브라우저 저장소에 쓰고 발표 화면이 읽는다.
describe("parseDrawSettings", () => {
  it("저장된 값이 없거나 깨졌으면 기본값(이전 당첨자 제외 켬)이다", () => {
    expect(DEFAULT_DRAW_SETTINGS).toEqual({ excludePrevious: true });
    for (const raw of [null, "", "{깨진", "123", "null"]) expect(parseDrawSettings(raw)).toEqual(DEFAULT_DRAW_SETTINGS);
  });

  it("저장된 값을 그대로 읽는다", () => {
    expect(parseDrawSettings(JSON.stringify({ excludePrevious: false }))).toEqual({ excludePrevious: false });
    expect(parseDrawSettings(JSON.stringify({ excludePrevious: true }))).toEqual({ excludePrevious: true });
  });

  it("값이 참·거짓이 아니면 기본값이고, 모르는 칸은 버린다", () => {
    expect(parseDrawSettings(JSON.stringify({ excludePrevious: "no" }))).toEqual({ excludePrevious: true });
    expect(parseDrawSettings(JSON.stringify({ excludePrevious: false, winnerCount: { prizeId: 3, count: 7 } }))).toEqual({
      excludePrevious: false,
    });
  });
});
