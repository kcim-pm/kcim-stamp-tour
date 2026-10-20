import { describe, it, expect } from "vitest";
import { keyToAction, isActionAllowed, type KeyContext } from "../lib/draw-keys";

// 발표 화면의 키보드 조작 규칙 (spec 3.4 「조작」). 버튼이 없으므로 이 표가 조작의 전부다.
const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({
  phase: "ready",
  busy: false,
  selectedCount: 0,
  ...over,
});

describe("keyToAction", () => {
  it("단축키를 동작으로 바꾼다", () => {
    expect(keyToAction(" ", "ready")).toBe("start");
    expect(keyToAction("Enter", "result")).toBe("confirm");
    expect(keyToAction("ArrowRight", "confirmed")).toBe("next");
    expect(keyToAction("Tab", "ready")).toBe("panel");
    expect(keyToAction("Escape", "ready")).toBe("escape");
  });

  it("Space 는 결과(임시) 단계에서만 재추첨이고, 나머지 단계에서는 추첨 시작이다", () => {
    expect(keyToAction(" ", "result")).toBe("redraw");
    expect(keyToAction(" ", "drawing")).toBe("start");
    expect(keyToAction(" ", "confirmed")).toBe("start");
    expect(keyToAction(" ", "done")).toBe("start");
  });

  it("옛 이름(Right, Esc)도 같은 동작이다", () => {
    expect(keyToAction("Right", "confirmed")).toBe("next");
    expect(keyToAction("Esc", "ready")).toBe("escape");
  });

  it("없앤 키(R, P, H)와 정해지지 않은 키는 null 이다", () => {
    for (const key of ["r", "R", "p", "P", "h", "H", "a", "ArrowLeft", "Shift"]) {
      expect(keyToAction(key, "result")).toBeNull();
    }
  });
});

describe("isActionAllowed", () => {
  it("단계에 맞는 키만 먹는다", () => {
    expect(isActionAllowed("start", ctx({ phase: "ready" }))).toBe(true);
    expect(isActionAllowed("start", ctx({ phase: "drawing" }))).toBe(false);
    expect(isActionAllowed("confirm", ctx({ phase: "result" }))).toBe(true);
    expect(isActionAllowed("confirm", ctx({ phase: "drawing" }))).toBe(false);
    expect(isActionAllowed("next", ctx({ phase: "confirmed" }))).toBe(true);
    expect(isActionAllowed("next", ctx({ phase: "result" }))).toBe(false);
  });

  it("재추첨은 결과 단계에서 번호를 하나 이상 골랐을 때만 된다. 고른 번호가 없으면 Space 는 아무 일도 하지 않는다", () => {
    expect(isActionAllowed("redraw", ctx({ phase: "result", selectedCount: 0 }))).toBe(false);
    expect(isActionAllowed("redraw", ctx({ phase: "result", selectedCount: 2 }))).toBe(true);
    expect(isActionAllowed("redraw", ctx({ phase: "confirmed", selectedCount: 2 }))).toBe(false);
  });

  it("요청 중(busy)에는 패널과 닫기만 된다. 두 번 눌러 회차가 두 개 생기는 것을 막는다", () => {
    expect(isActionAllowed("start", ctx({ phase: "ready", busy: true }))).toBe(false);
    expect(isActionAllowed("redraw", ctx({ phase: "result", selectedCount: 1, busy: true }))).toBe(false);
    expect(isActionAllowed("panel", ctx({ busy: true }))).toBe(true);
    expect(isActionAllowed("escape", ctx({ busy: true }))).toBe(true);
  });

  it("종료 단계에서는 패널과 닫기만 된다", () => {
    const done = ctx({ phase: "done" });
    expect(isActionAllowed("start", done)).toBe(false);
    expect(isActionAllowed("next", done)).toBe(false);
    expect(isActionAllowed("panel", done)).toBe(true);
    expect(isActionAllowed("escape", done)).toBe(true);
  });
});
