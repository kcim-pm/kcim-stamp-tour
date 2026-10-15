// lib/draw-state.ts — 회차 상태 전이 규칙 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 회차(draws)·당첨 기록(draw_winners)·경품 목록을 인자로 받아
// 「이 조작을 해도 되는가」만 판정한다. 실제 갱신은 Route Handler 가 한다.
//
// 오류를 코드 문자열로 throw 하는 이유: draw.ts 와 같다. 함수 이름이 assert 로 시작하면
// 「통과하면 아무 일 없고, 아니면 던진다」는 뜻.

// 상태 값과 열 이름은 DB(spec 4장)와 같다. 판정에 필요한 열만 둔다.
export type DrawStatus = "pending" | "confirmed";
export type WinnerStatus = "pending" | "confirmed" | "absent";

export type DrawRow = { id: number; prize_id: number; status: DrawStatus };
export type WinnerRow = {
  draw_id: number;
  participant_no: number;
  status: WinnerStatus;
  gift_given_at: string | null;
};
export type PrizeRow = { id: number; sort: number };

// spec 6장 「회차 상태」「경품 순서」
export function assertCanStartDraw(draws: DrawRow[], prizeId: number): void {
  // 임시 결과를 확정하지 않고 다음 경품으로 넘어가면 어느 쪽이 진짜 결과인지 알 수 없다 (D-18)
  if (draws.some((d) => d.status === "pending")) {
    throw new Error("DRAW_PENDING_EXISTS");
  }
  // 같은 경품을 두 번 추첨하면 당첨자가 두 묶음 생긴다. 잘못 확정한 회차는 DB 에서 지운다 (10/15 결정)
  if (draws.some((d) => d.prize_id === prizeId && d.status === "confirmed")) {
    throw new Error("PRIZE_ALREADY_DRAWN");
  }
}

// 재추첨과 확정 둘 다 이 검사를 먼저 거친다.
export function assertPending(draw: DrawRow): void {
  if (draw.status !== "pending") {
    throw new Error("DRAW_NOT_PENDING");
  }
}

// spec 5.3 redraw. participantNos 는 발표 화면에서 고른 번호들이다 (D-18 「선택 번호 재추첨」).
// 전부 「이 회차에서 status = 'pending' 인 당첨자」여야 하고 중복이 없어야 한다.
export function assertRedrawSelection(winners: WinnerRow[], participantNos: number[]): void {
  const pendingNos = new Set(winners.filter((w) => w.status === "pending").map((w) => w.participant_no));
  const valid =
    participantNos.length > 0 &&
    new Set(participantNos).size === participantNos.length &&
    participantNos.every((no) => pendingNos.has(no));

  if (!valid) {
    throw new Error("INVALID_WINNER_SELECTION");
  }
}

// spec 5.3 winners. winner 는 이 회차에서 그 번호의 당첨 기록이고, 없으면 null 을 넘긴다.
// 확정 회차에도 absent 행(부재자)이 기록으로 남아 있으므로, 회차만 보면 부재자가 지급 처리된다.
// 「이미 지급됨(ALREADY_GIVEN)」은 여기서 보지 않는다. DB 의 조건부 갱신(gift_given_at is null)이
// 맡는다 (D-11). 두 운영자가 동시에 눌러도 DB 가 한 번만 받아 주기 때문이다.
export function assertCanGiveGift(draw: DrawRow, winner: WinnerRow | null): void {
  if (draw.status !== "confirmed") {
    throw new Error("DRAW_NOT_CONFIRMED");
  }
  if (winner === null || winner.status !== "confirmed") {
    throw new Error("INVALID_WINNER_SELECTION");
  }
}

// spec 6장 「경품 순서」. sort 오름차순으로 「confirmed 회차가 없는」 첫 경품. 전부 확정했으면 null.
// 뽑는 중(pending)인 경품은 확정 전이므로 그 경품이 그대로 「지금 차례」다 (D-10).
// 발표 화면 페이지와 GET /api/admin/draws 가 같이 쓴다.
export function currentPrize<P extends PrizeRow>(prizes: P[], draws: DrawRow[]): P | null {
  const confirmedPrizeIds = new Set(draws.filter((d) => d.status === "confirmed").map((d) => d.prize_id));
  const ordered = [...prizes].sort((a, b) => a.sort - b.sort);
  return ordered.find((p) => !confirmedPrizeIds.has(p.id)) ?? null;
}

// spec 5.3 confirm. pending 은 confirmed 로, absent 는 그대로. Route Handler 가 이 결과대로 update 한다.
export function confirmedWinners(winners: WinnerRow[]): WinnerRow[] {
  return winners.map((w) => (w.status === "pending" ? { ...w, status: "confirmed" } : { ...w }));
}
