import { describe, it, expect } from "vitest";
import { winnerLayout } from "../lib/winner-layout";

// 당첨 번호의 크기와 배치는 인원에 따라 달라진다 (spec 3.4 「당첨 번호 배치」, 안 A).
describe("winnerLayout", () => {
  it("1명은 하나를 아주 크게, 2명은 둘을 가로로 크게 놓는다", () => {
    expect(winnerLayout(1)).toEqual({ kind: "single", size: 200, cols: 1 });
    expect(winnerLayout(2)).toEqual({ kind: "pair", size: 160, cols: 2 });
  });

  it("3~5명은 한 줄 격자, 6~10명은 5열 두 줄, 11~20명은 5열 네 줄로 줄어든다", () => {
    expect(winnerLayout(3)).toEqual({ kind: "grid", size: 120, cols: 3 });
    expect(winnerLayout(5)).toEqual({ kind: "grid", size: 120, cols: 5 });
    expect(winnerLayout(6)).toEqual({ kind: "grid", size: 96, cols: 5 });
    expect(winnerLayout(10)).toEqual({ kind: "grid", size: 96, cols: 5 });
    expect(winnerLayout(11)).toEqual({ kind: "grid", size: 72, cols: 5 });
    expect(winnerLayout(20)).toEqual({ kind: "grid", size: 72, cols: 5 });
  });

  it("21명부터는 10열로 더 작게 놓는다. 화면에 다 들어가는 것이 우선이다", () => {
    expect(winnerLayout(21)).toEqual({ kind: "grid", size: 56, cols: 10 });
    expect(winnerLayout(40)).toEqual({ kind: "grid", size: 56, cols: 10 });
  });

  it("0명이나 음수는 1명과 같게 다룬다. 화면이 비지 않게 하기 위해서다", () => {
    expect(winnerLayout(0)).toEqual(winnerLayout(1));
    expect(winnerLayout(-3)).toEqual(winnerLayout(1));
  });
});
