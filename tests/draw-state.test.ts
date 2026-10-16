import { describe, it, expect } from "vitest";
import {
  assertCanStartDraw,
  assertPending,
  assertRedrawSelection,
  confirmedWinners,
  currentPrize,
  splitPrizeChanges,
  assignPrizeSorts,
  orderPrizesForEditing,
  type PrizeRecord,
  type DrawRow,
  type WinnerRow,
} from "../lib/draw-state";

// 회차·당첨 기록은 필요한 열만 가진 작은 객체로 만든다.
const draw = (id: number, prize_id: number, status: DrawRow["status"]): DrawRow => ({ id, prize_id, status });
const winner = (participant_no: number, status: WinnerRow["status"], draw_id = 1): WinnerRow => ({
  draw_id,
  participant_no,
  status,
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


describe("경품 목록 변경 내용 나누기", () => {
  // DB 에 경품 두 개가 있다. 「이미 추첨한 경품」이 필요한 사례에서는 경품 1 을 넘긴다.
  const P1: PrizeRecord = { id: 1, name: "5등 커피", winnerCount: 10, sort: 1 };
  const P2: PrizeRecord = { id: 2, name: "4등 텀블러", winnerCount: 5, sort: 2 };
  const current = [P1, P2];

  describe("정상적으로 나뉘는 경우", () => {
    it("번호 없는 새 경품을 보내면 「추가」 묶음에 들어간다", () => {
      const result = splitPrizeChanges(current, [P1, P2, { name: "2등 태블릿", winnerCount: 1, sort: 3 }], []);
      expect(result).toEqual({
        toInsert: [{ name: "2등 태블릿", winnerCount: 1, sort: 3 }],
        toUpdate: [],
        toDelete: [],
      });
    });

    it("아직 추첨하지 않은 경품의 이름을 바꾸면 「수정」 묶음에 들어간다", () => {
      const changed = { ...P2, name: "4등 머그컵" };
      expect(splitPrizeChanges(current, [P1, changed], [1]).toUpdate).toEqual([changed]);
    });

    it("아무것도 바꾸지 않은 경품은 「수정」 묶음에 들어가지 않는다", () => {
      expect(splitPrizeChanges(current, [P1, P2], [])).toEqual({ toInsert: [], toUpdate: [], toDelete: [] });
    });

    it("아직 추첨하지 않은 경품을 목록에서 빼면 「삭제」 묶음에 들어간다", () => {
      expect(splitPrizeChanges(current, [P1], [1]).toDelete).toEqual([2]);
    });

    it("이미 추첨한 경품을 그대로 보내면 오류 없이 통과하고, 어느 묶음에도 들어가지 않는다", () => {
      const result = splitPrizeChanges(current, [P1, { ...P2, winnerCount: 7 }], [1]);
      expect(result).toEqual({ toInsert: [], toUpdate: [{ ...P2, winnerCount: 7 }], toDelete: [] });
    });

    it("이미 추첨한 경품이 없을 때 빈 목록을 보내면 모든 경품이 「삭제」 묶음에 들어간다", () => {
      expect(splitPrizeChanges(current, [], []).toDelete).toEqual([1, 2]);
    });

    it("이름 앞뒤 공백은 지우고 저장한다 (공백만 바뀐 것은 변경이 아니다)", () => {
      expect(splitPrizeChanges(current, [{ ...P1, name: " 5등 커피 " }, P2], [1])).toEqual({
        toInsert: [],
        toUpdate: [],
        toDelete: [],
      });
    });
  });

  describe("이미 추첨한 경품을 바꾸면 PRIZE_ALREADY_DRAWN", () => {
    it.each([
      ["이름", { name: "5등 아이스커피" }],
      ["당첨 인원", { winnerCount: 12 }],
      ["순서", { sort: 3 }],
    ])("%s 을(를) 바꾼 경우", (_label, change) => {
      expect(() => splitPrizeChanges(current, [{ ...P1, ...change }, P2], [1])).toThrow("PRIZE_ALREADY_DRAWN");
    });

    it("목록에서 뺀 경우 (삭제하려는 경우)", () => {
      expect(() => splitPrizeChanges(current, [P2], [1])).toThrow("PRIZE_ALREADY_DRAWN");
    });
  });

  describe("내용이 틀리면 오류", () => {
    it.each([0, -1, 1.5, "3", null])("당첨 인원이 %j 이면 INVALID_WINNER_COUNT", (winnerCount) => {
      expect(() => splitPrizeChanges(current, [P1, { ...P2, winnerCount }], [])).toThrow("INVALID_WINNER_COUNT");
    });

    it.each(["", "   ", null])("이름이 %j 이면 INVALID_BODY", (name) => {
      expect(() => splitPrizeChanges(current, [P1, { ...P2, name }], [])).toThrow("INVALID_BODY");
    });

    it("순서가 정수가 아니면 INVALID_BODY", () => {
      expect(() => splitPrizeChanges(current, [P1, { ...P2, sort: "1" }], [])).toThrow("INVALID_BODY");
    });

    it("등급(rank)을 보내도 저장 내용에 넣지 않는다 (DB 에 없는 열)", () => {
      const result = splitPrizeChanges(current, [P1, P2, { rank: 2, name: "2등 태블릿", winnerCount: 1, sort: 3 }], []);
      expect(result.toInsert).toEqual([{ name: "2등 태블릿", winnerCount: 1, sort: 3 }]);
    });

    it("DB 에 없는 경품 번호를 보내면 INVALID_BODY", () => {
      expect(() => splitPrizeChanges(current, [P1, { ...P2, id: 99 }], [])).toThrow("INVALID_BODY");
    });

    it("같은 경품 번호를 두 번 보내면 INVALID_BODY", () => {
      expect(() => splitPrizeChanges(current, [P1, P2, { ...P2, name: "다른 이름" }], [])).toThrow("INVALID_BODY");
    });

    it("경품 한 줄이 객체가 아니면 INVALID_BODY", () => {
      expect(() => splitPrizeChanges(current, [P1, "경품"], [])).toThrow("INVALID_BODY");
    });
  });

  describe("검사 순서", () => {
    it("이미 추첨한 경품을 빼면서 다른 경품의 당첨 인원도 0 이면, INVALID_WINNER_COUNT 가 먼저 나온다", () => {
      expect(() => splitPrizeChanges(current, [{ ...P2, winnerCount: 0 }], [1])).toThrow("INVALID_WINNER_COUNT");
    });
  });
});

describe("경품 표 순서", () => {
  const prize = (sort: number | null, drawn = false) => ({ sort, drawn });

  describe("편집 화면 줄 순서 (orderPrizesForEditing)", () => {
    it("추첨한 경품을 맨 위로 올리고, 각 묶음 안에서는 받은 순서를 유지한다", () => {
      const a = prize(1);
      const b = prize(2, true);
      const c = prize(3);
      const d = prize(4, true);
      expect(orderPrizesForEditing([a, b, c, d])).toEqual([b, d, a, c]);
    });

    it("원본 배열을 바꾸지 않는다", () => {
      const rows = [prize(1), prize(2, true)];
      orderPrizesForEditing(rows);
      expect(rows).toEqual([prize(1), prize(2, true)]);
    });
  });

  describe("저장할 sort 매기기 (assignPrizeSorts)", () => {
    it("추첨한 경품이 없으면 위에서부터 1, 2, 3", () => {
      expect(assignPrizeSorts([prize(7), prize(null), prize(2)])).toEqual([1, 2, 3]);
    });

    it("추첨한 경품은 sort 그대로, 나머지는 그 뒤로 이어서 매긴다", () => {
      expect(assignPrizeSorts([prize(1, true), prize(2, true), prize(9), prize(null)])).toEqual([1, 2, 3, 4]);
    });

    it("추첨한 경품의 sort 가 띄엄띄엄이어도 나머지는 가장 큰 값 다음부터", () => {
      expect(assignPrizeSorts([prize(1, true), prize(5, true), prize(2)])).toEqual([1, 5, 6]);
    });

    it("빈 목록이면 빈 목록", () => {
      expect(assignPrizeSorts([])).toEqual([]);
    });
  });
});
