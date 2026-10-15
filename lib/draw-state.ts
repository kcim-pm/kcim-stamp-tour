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

// ── 의사 코드 (작업 7 추가분, 아직 구현 전) ─────────────────────────────
//
// 【함수 7: 경품 목록 변경 내용 나누기 (splitPrizeChanges)】  spec 5.3 PUT prizes, A-12
//
// 왜 필요한가:
//   콘솔의 경품 목록 화면은 [저장]을 누르면 「화면에 보이는 표 전체」를 서버로 보낸다 (spec 5.3 「통째로 저장」).
//   그런데 DB 에는 「표 전체를 이걸로 바꿔라」라는 명령이 없다. 줄마다 추가·수정·삭제 중 하나를 골라 명령해야 한다.
//   그래서 「DB 에 지금 있는 표」와 「화면이 보낸 표」를 비교해, 어떤 줄을 추가·수정·삭제해야 하는지 나눠 주는 함수가 필요하다.
//   나누는 김에 「이미 추첨한 경품은 수정·삭제할 수 없다」(A-12) 규칙도 여기서 검사한다.
//   DB 는 건드리지 않는다. API 는 이 함수가 나눠 준 대로 저장만 한다.
//
// 예시:
//   DB 에 지금 있는 표                    화면이 보낸 표
//   ┌────┬─────────────┬────┐            ┌────┬─────────────┬────┐
//   │ 1  │ 5등 커피     │ 10명│  (추첨함)   │ 1  │ 5등 커피     │ 10명│  ← 그대로
//   │ 2  │ 4등 텀블러   │ 5명 │            │ 2  │ 4등 텀블러   │ 7명 │  ← 인원을 바꿈
//   │ 3  │ 3등 이어폰   │ 3명 │            │    │ 2등 태블릿   │ 1명 │  ← 번호 없음 = 새 줄
//   └────┴─────────────┴────┘            └────┴─────────────┴────┘
//                                         (3번 이어폰은 화면에서 지웠다)
//   결과: 추가 = [2등 태블릿], 수정 = [2번 텀블러 7명], 삭제 = [3번 이어폰]
//   1번 커피는 이미 추첨했지만 아무것도 바꾸지 않았으므로 문제없다. 어느 묶음에도 들어가지 않는다.
//   만약 화면이 1번 커피를 12명으로 바꿔 보냈거나 목록에서 뺐다면 PRIZE_ALREADY_DRAWN 오류가 난다.
//
// 받는 것: ① DB 에 지금 있는 경품 목록 ② 화면이 보낸 경품 목록 ③ 이미 추첨한 경품의 번호 목록
// 돌려주는 것: 추가할 경품, 수정할 경품, 삭제할 경품 번호 (세 묶음)
//
// 처리 순서:
//   1. 화면이 보낸 경품을 한 줄씩 검사한다. 하나라도 틀리면 바로 멈춘다.
//      - 당첨 인원이 1 이상의 정수가 아니면 → INVALID_WINNER_COUNT
//      - 이름이 비었거나(공백만 있어도 빈 것), 등급·순서가 정수가 아니면 → INVALID_BODY
//      - 경품 번호가 있는데 DB 에 없는 번호면 → INVALID_BODY (다른 창에서 이미 지운 경품)
//      - 같은 경품 번호가 두 번 나오면 → INVALID_BODY
//   2. 이미 추첨한 경품을 하나씩 검사한다.
//      - 화면이 보낸 목록에 없으면, 삭제하려는 것이다 → PRIZE_ALREADY_DRAWN
//      - 등급·이름·당첨 인원·순서 중 하나라도 바뀌었으면 → PRIZE_ALREADY_DRAWN
//   3. 세 묶음으로 나눈다.
//      - 추가: 경품 번호가 없는 줄 (화면에서 새로 만든 줄)
//      - 수정: 경품 번호가 있고, 값이 실제로 바뀐 줄. 안 바뀐 줄은 넣지 않는다.
//      - 삭제: DB 에는 있는데 화면이 보낸 목록에서 빠진 경품
//   검사 순서는 1번(내용이 올바른가) → 2번(이미 추첨했는가)이다. 테스트로 이 순서를 고정한다.
//
// 여기(lib/draw-state.ts)에 두는 이유:
//   「이미 추첨한 경품은 바꿀 수 없다」는 상태 규칙이라 단위 테스트로 지켜야 한다 (assertCanGiveGift 와 같은 이유).
//
// 「이미 추첨한 경품」의 기준: [추첨 시작]을 한 번이라도 누른 경품. 확정 전 임시 결과만 있어도 포함한다 (spec A-12).
//   이유 ① 임시 결과가 있는 경품을 지우면 DB 가 거부해서 500 오류가 난다.
//        ② 추첨하는 도중에 당첨 인원을 바꾸면 발표 화면의 「N명 추첨」과 실제 결과가 어긋난다.
//   경품 목록 조회 API 의 drawn 값도 같은 기준이다.
