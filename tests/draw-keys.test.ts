import { describe, it, expect } from "vitest";
import { keyToAction, isActionAllowed, type KeyContext } from "../lib/draw-keys";

// 발표 화면의 키보드 조작 규칙 (spec 3.4 「조작」). 버튼이 없으므로 이 표가 조작의 전부다.
const ctx = (over: Partial<KeyContext> = {}): KeyContext => ({
  phase: "ready",
  busy: false,
  selectedCount: 0,
  hasHistory: false,
  typing: false,
  ...over,
});

describe("keyToAction", () => {
  it("단축키를 동작으로 바꾼다. 영문자는 대소문자를 가리지 않는다", () => {
    expect(keyToAction(" ")).toBe("start");
    expect(keyToAction("Enter")).toBe("confirm");
    expect(keyToAction("r")).toBe("redraw");
    expect(keyToAction("R")).toBe("redraw");
    expect(keyToAction("p")).toBe("pause");
    expect(keyToAction("ArrowRight")).toBe("next");
    expect(keyToAction("h")).toBe("history");
    expect(keyToAction("Tab")).toBe("panel");
    expect(keyToAction("Escape")).toBe("escape");
  });

  it("옛 이름(Right, Esc)도 같은 동작이다", () => {
    expect(keyToAction("Right")).toBe("next");
    expect(keyToAction("Esc")).toBe("escape");
  });

  it("정해지지 않은 키는 null 이다", () => {
    expect(keyToAction("a")).toBeNull();
    expect(keyToAction("ArrowLeft")).toBeNull();
    expect(keyToAction("Shift")).toBeNull();
  });
});

describe("isActionAllowed", () => {
  it("단계에 맞는 키만 먹는다", () => {
    expect(isActionAllowed("start", ctx({ phase: "ready" }))).toBe(true);
    expect(isActionAllowed("start", ctx({ phase: "result" }))).toBe(false);
    expect(isActionAllowed("confirm", ctx({ phase: "result" }))).toBe(true);
    expect(isActionAllowed("confirm", ctx({ phase: "drawing" }))).toBe(false);
    expect(isActionAllowed("pause", ctx({ phase: "drawing" }))).toBe(true);
    expect(isActionAllowed("pause", ctx({ phase: "ready" }))).toBe(false);
    expect(isActionAllowed("next", ctx({ phase: "confirmed" }))).toBe(true);
    expect(isActionAllowed("next", ctx({ phase: "result" }))).toBe(false);
  });

  it("재추첨은 결과 단계에서 번호를 하나 이상 골랐을 때만 된다", () => {
    expect(isActionAllowed("redraw", ctx({ phase: "result", selectedCount: 0 }))).toBe(false);
    expect(isActionAllowed("redraw", ctx({ phase: "result", selectedCount: 2 }))).toBe(true);
    expect(isActionAllowed("redraw", ctx({ phase: "confirmed", selectedCount: 2 }))).toBe(false);
  });

  it("이전 결과는 확정된 회차가 있을 때만 열린다", () => {
    expect(isActionAllowed("history", ctx({ hasHistory: false }))).toBe(false);
    expect(isActionAllowed("history", ctx({ hasHistory: true, phase: "drawing" }))).toBe(true);
  });

  it("요청 중(busy)에는 패널과 닫기만 된다. 두 번 눌러 회차가 두 개 생기는 것을 막는다", () => {
    const busy = ctx({ phase: "ready", busy: true, hasHistory: true });
    expect(isActionAllowed("start", busy)).toBe(false);
    expect(isActionAllowed("history", busy)).toBe(false);
    expect(isActionAllowed("panel", busy)).toBe(true);
    expect(isActionAllowed("escape", busy)).toBe(true);
  });

  it("입력란에 글자를 치는 중에는 패널과 닫기만 된다. 인원 입력란의 Space 가 추첨을 시작하면 안 된다", () => {
    const typing = ctx({ phase: "ready", typing: true });
    expect(isActionAllowed("start", typing)).toBe(false);
    expect(isActionAllowed("panel", typing)).toBe(true);
    expect(isActionAllowed("escape", typing)).toBe(true);
  });

  it("종료 단계에서는 이전 결과와 패널만 된다", () => {
    const done = ctx({ phase: "done", hasHistory: true });
    expect(isActionAllowed("start", done)).toBe(false);
    expect(isActionAllowed("next", done)).toBe(false);
    expect(isActionAllowed("history", done)).toBe(true);
    expect(isActionAllowed("panel", done)).toBe(true);
  });
});
