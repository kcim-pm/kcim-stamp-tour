import { describe, it, expect } from "vitest";
import { winnerDisplayOrder, winnerEnterOrder, winnerLayout } from "../lib/winner-layout";

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

// spec 3.4 「동작 규칙」. 이슈 #6
// 재추첨 묶음(redraws)은 발표 화면이 기억한다. 재추첨 한 번에 새로 뽑힌 번호들이 한 묶음이다.
describe("winnerDisplayOrder", () => {
  it("재추첨이 없으면 오름차순", () => {
    expect(winnerDisplayOrder([42, 3, 17], [])).toEqual([3, 17, 42]);
  });

  it("재추첨 번호는 기존 번호 뒤에 붙는다. 기존 번호보다 작아도 뒤다", () => {
    expect(winnerDisplayOrder([3, 8, 17, 42], [[8]])).toEqual([3, 17, 42, 8]);
  });

  it("여러 번 재추첨하면 재추첨한 순서대로 붙는다", () => {
    expect(winnerDisplayOrder([3, 5, 8, 17, 42], [[42], [5]])).toEqual([3, 8, 17, 42, 5]);
  });

  it("한 번에 여러 개를 뽑았으면 그 묶음 안에서만 오름차순", () => {
    expect(winnerDisplayOrder([3, 8, 17, 42, 250], [[250, 8]])).toEqual([3, 17, 42, 8, 250]);
  });

  it("재추첨 번호가 다시 부재자로 빠져 목록에 없으면 건너뛴다", () => {
    expect(winnerDisplayOrder([3, 17, 99], [[8], [99]])).toEqual([3, 17, 99]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const nos = [17, 3];
    const redraws = [[9, 1]];
    winnerDisplayOrder(nos, redraws);
    expect(nos).toEqual([17, 3]);
    expect(redraws).toEqual([[9, 1]]);
  });
});

// 번호가 굴러 들어오는 차례. 화면은 차례 × 70ms 늦게 굴린다 (spec 3.4 「동작 규칙」).
// 재추첨 번호는 맨 끝에 붙으므로 자리 순서를 그대로 쓰면 20명일 때 1.3초를 기다린다 (이슈 #6 확인 중 발견).
describe("winnerEnterOrder", () => {
  it("처음 추첨은 자리 순서대로 0, 1, 2…", () => {
    expect(winnerEnterOrder([3, 17, 42], new Set())).toEqual([0, 1, 2]);
  });

  it("재추첨 번호는 자리와 관계없이 0부터. 끝자리여도 기다리지 않는다", () => {
    expect(winnerEnterOrder([3, 17, 42, 8], new Set([8]))).toEqual([0, 1, 2, 0]);
  });

  it("한 번에 여러 개면 그 묶음 안에서만 0, 1, 2…", () => {
    expect(winnerEnterOrder([3, 17, 8, 250], new Set([8, 250]))).toEqual([0, 1, 0, 1]);
  });
});
