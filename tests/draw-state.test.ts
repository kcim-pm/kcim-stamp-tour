import { describe, it, expect } from "vitest";
import {
  assertCanGiveGift,
  assertCanStartDraw,
  assertPending,
  assertRedrawSelection,
  confirmedWinners,
  currentPrize,
  type DrawRow,
  type WinnerRow,
} from "../lib/draw-state";

// 회차·당첨 기록은 필요한 열만 가진 작은 객체로 만든다.
const draw = (id: number, prize_id: number, status: DrawRow["status"]): DrawRow => ({ id, prize_id, status });
const winner = (participant_no: number, status: WinnerRow["status"], draw_id = 1): WinnerRow => ({
  draw_id,
  participant_no,
  status,
  gift_given_at: null,
});

describe("새 추첨 시작", () => {
  it("pending 회차가 있으면 DRAW_PENDING_EXISTS", () => {
    expect(() => assertCanStartDraw([draw(1, 1, "pending")], 2)).toThrow("DRAW_PENDING_EXISTS");
  });

  it("다른 경품의 회차가 전부 confirmed 면 통과", () => {
    expect(() => assertCanStartDraw([draw(1, 1, "confirmed"), draw(2, 2, "confirmed")], 3)).not.toThrow();
  });

  it("회차가 하나도 없으면 통과", () => {
    expect(() => assertCanStartDraw([], 1)).not.toThrow();
  });

  it("같은 경품에 confirmed 회차가 있으면 PRIZE_ALREADY_DRAWN", () => {
    expect(() => assertCanStartDraw([draw(1, 1, "confirmed")], 1)).toThrow("PRIZE_ALREADY_DRAWN");
  });

  it("pending 회차와 같은 경품 confirmed 회차가 둘 다 있으면 DRAW_PENDING_EXISTS 가 먼저다", () => {
    expect(() => assertCanStartDraw([draw(1, 1, "confirmed"), draw(2, 2, "pending")], 1)).toThrow(
      "DRAW_PENDING_EXISTS",
    );
  });
});

describe("재추첨·확정 가능 여부", () => {
  it("pending 회차는 통과", () => {
    expect(() => assertPending(draw(1, 1, "pending"))).not.toThrow();
  });

  it("confirmed 회차는 DRAW_NOT_PENDING", () => {
    expect(() => assertPending(draw(1, 1, "confirmed"))).toThrow("DRAW_NOT_PENDING");
  });
});

describe("재추첨 대상 검사", () => {
  const winners = [winner(3, "pending"), winner(5, "pending"), winner(8, "absent")];

  it("이 회차의 pending 당첨자만 골랐으면 통과 (여러 명도 통과)", () => {
    expect(() => assertRedrawSelection(winners, [3])).not.toThrow();
    expect(() => assertRedrawSelection(winners, [3, 5])).not.toThrow();
  });

  it("빈 목록이면 INVALID_WINNER_SELECTION", () => {
    expect(() => assertRedrawSelection(winners, [])).toThrow("INVALID_WINNER_SELECTION");
  });

  it("이미 absent 인 번호를 고르면 INVALID_WINNER_SELECTION", () => {
    expect(() => assertRedrawSelection(winners, [8])).toThrow("INVALID_WINNER_SELECTION");
  });

  it("이 회차에 없는 번호를 고르면 INVALID_WINNER_SELECTION", () => {
    expect(() => assertRedrawSelection(winners, [3, 99])).toThrow("INVALID_WINNER_SELECTION");
  });

  it("같은 번호를 두 번 보내면 INVALID_WINNER_SELECTION", () => {
    expect(() => assertRedrawSelection(winners, [3, 3])).toThrow("INVALID_WINNER_SELECTION");
  });
});

describe("지급 가능 여부", () => {
  it("confirmed 회차의 confirmed 당첨자는 통과", () => {
    expect(() => assertCanGiveGift(draw(1, 1, "confirmed"), winner(7, "confirmed"))).not.toThrow();
  });

  it("pending 회차는 DRAW_NOT_CONFIRMED", () => {
    expect(() => assertCanGiveGift(draw(1, 1, "pending"), winner(7, "pending"))).toThrow("DRAW_NOT_CONFIRMED");
  });

  it("확정 회차에 남은 absent 행(부재자)은 INVALID_WINNER_SELECTION", () => {
    expect(() => assertCanGiveGift(draw(1, 1, "confirmed"), winner(42, "absent"))).toThrow(
      "INVALID_WINNER_SELECTION",
    );
  });

  it("이 회차에 기록이 없는 번호(null)는 INVALID_WINNER_SELECTION", () => {
    expect(() => assertCanGiveGift(draw(1, 1, "confirmed"), null)).toThrow("INVALID_WINNER_SELECTION");
  });

  it("회차 검사가 당첨자 검사보다 먼저다", () => {
    expect(() => assertCanGiveGift(draw(1, 1, "pending"), null)).toThrow("DRAW_NOT_CONFIRMED");
  });
});

describe("지금 차례인 경품", () => {
  // sort 순서와 배열 순서를 일부러 다르게 둔다.
  const A = { id: 1, sort: 1 };
  const B = { id: 2, sort: 2 };
  const C = { id: 3, sort: 3 };

  it("확정 회차가 없는 경품 중 sort 가 가장 작은 것", () => {
    expect(currentPrize([C, A, B], [draw(1, A.id, "confirmed")])).toEqual(B);
  });

  it("pending 회차만 있는 경품은 아직 추첨하지 않은 것으로 본다", () => {
    expect(currentPrize([A, B], [draw(1, A.id, "pending")])).toEqual(A);
  });

  it("전부 확정했으면 null", () => {
    expect(currentPrize([A, B], [draw(1, A.id, "confirmed"), draw(2, B.id, "confirmed")])).toBeNull();
  });

  it("경품 목록이 비어 있으면 null", () => {
    expect(currentPrize([], [])).toBeNull();
  });

  it("원본 경품 배열의 순서를 바꾸지 않는다", () => {
    const prizes = [C, A, B];
    currentPrize(prizes, []);
    expect(prizes).toEqual([C, A, B]);
  });
});

describe("확정 후 당첨자 상태", () => {
  it("pending 은 confirmed 로 바뀐다", () => {
    expect(confirmedWinners([winner(3, "pending")])).toEqual([winner(3, "confirmed")]);
  });

  it("absent 는 그대로다", () => {
    expect(confirmedWinners([winner(3, "pending"), winner(8, "absent")])).toEqual([
      winner(3, "confirmed"),
      winner(8, "absent"),
    ]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const winners = [winner(3, "pending")];
    confirmedWinners(winners);
    expect(winners).toEqual([winner(3, "pending")]);
  });
});
