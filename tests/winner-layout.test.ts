import { describe, it, expect } from "vitest";
import {
  REEL_DIGIT_GAP_MS,
  REEL_SLOT_GAP_MS,
  REEL_SPIN_MS,
  REEL_STOP_MS,
  padNo,
  reelStopAt,
  reelTotalMs,
  winnerDisplayOrder,
  winnerEnterOrder,
  winnerLayout,
} from "../lib/winner-layout";

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

// 무대의 릴은 세 자리 고정이라 번호 앞을 0 으로 채운다 (spec 3.4 「추첨 중」, 마케팅팀 피드백 10/22).
describe("padNo", () => {
  it("한 자리·두 자리 번호는 앞을 0 으로 채우고, 세 자리는 그대로", () => {
    expect(padNo(3)).toBe("003");
    expect(padNo(64)).toBe("064");
    expect(padNo(132)).toBe("132");
    expect(padNo(999)).toBe("999");
  });
});

// 릴이 멈추는 일정 (spec 3.4 「추첨 중」). 첫 릴이 돈 뒤 첫 칸부터 하나씩, 칸 안에서는 백→십→일 순으로 멈춘다.
// 한 칸이 다 멈추면 번호를 발표할 시간을 두고 다음 칸이 멈추기 시작한다.
describe("reelStopAt", () => {
  it("첫 칸의 백의 자리는 첫 릴 시간이 지난 뒤 멈춘다", () => {
    expect(reelStopAt(0, 0)).toBe(REEL_SPIN_MS);
  });

  it("같은 칸 안에서는 자릿수 간격만큼 늦게 멈춘다", () => {
    expect(reelStopAt(0, 1)).toBe(REEL_SPIN_MS + REEL_DIGIT_GAP_MS);
    expect(reelStopAt(0, 2)).toBe(REEL_SPIN_MS + 2 * REEL_DIGIT_GAP_MS);
  });

  it("다음 칸은 앞 칸의 일의 자리가 다 멈춘 뒤 발표 간격이 지나서 멈추기 시작한다", () => {
    const slotDuration = 2 * REEL_DIGIT_GAP_MS + REEL_STOP_MS;
    expect(reelStopAt(1, 0)).toBe(REEL_SPIN_MS + slotDuration + REEL_SLOT_GAP_MS);
    expect(reelStopAt(2, 0)).toBe(REEL_SPIN_MS + 2 * (slotDuration + REEL_SLOT_GAP_MS));
  });

  it("값은 마케팅팀 피드백(첫 릴 1.5초, 발표 간격 1초, 자릿수 간격 0.5초)이다", () => {
    expect(REEL_SPIN_MS).toBe(1500);
    expect(REEL_SLOT_GAP_MS).toBe(1000);
    expect(REEL_DIGIT_GAP_MS).toBe(500);
  });
});

describe("reelTotalMs", () => {
  it("마지막 칸의 일의 자리가 멈추고 감속이 끝나는 시각이다", () => {
    expect(reelTotalMs(1)).toBe(reelStopAt(0, 2) + REEL_STOP_MS);
    expect(reelTotalMs(20)).toBe(reelStopAt(19, 2) + REEL_STOP_MS);
  });

  it("0명이나 음수는 1명과 같게 다룬다", () => {
    expect(reelTotalMs(0)).toBe(reelTotalMs(1));
  });
});
