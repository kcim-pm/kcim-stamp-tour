// lib/draw-state.ts — 회차 상태 전이 규칙 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 회차(draws)·당첨 기록(draw_winners)·경품 목록을 인자로 받아
// 「이 조작을 해도 되는가」만 판정한다. 실제 갱신은 Route Handler 가 한다.
// 상태 값은 DB 와 같다. 회차: 'pending' | 'confirmed'. 당첨 기록: 'pending' | 'confirmed' | 'absent'.

// ── 타입 (spec 4장과 같은 이름) ───────────────────────
// DrawRow     { id, prize_id, status }
// WinnerRow   { draw_id, participant_no, status, gift_given_at }
// PrizeRow    { id, sort }

// ── 함수 1: 새 추첨을 시작해도 되는가 ─────────────────  spec 6장 「회차 상태」「경품 순서」
// assertCanStartDraw(draws, prizeId)
//   1. status 가 'pending' 인 회차가 하나라도 있으면 throw new Error("DRAW_PENDING_EXISTS")
//      이유: 임시 결과를 확정하지 않고 다음 경품으로 넘어가면 어느 쪽이 진짜 결과인지 알 수 없다 (D-18)
//   2. prize_id 가 prizeId 이고 status 가 'confirmed' 인 회차가 있으면 throw new Error("PRIZE_ALREADY_DRAWN")
//      이유: 같은 경품을 두 번 추첨하면 당첨자가 두 묶음 생긴다. 잘못 확정한 회차는 DB 에서 지운다 (10/15 결정)

// ── 함수 2: 재추첨·확정을 해도 되는가 ─────────────────
// assertPending(draw)
//   draw.status 가 'pending' 이 아니면 throw new Error("DRAW_NOT_PENDING")
//   재추첨과 확정 둘 다 이 검사를 먼저 거친다.

// ── 함수 3: 재추첨 대상이 올바른가 ────────────────────  spec 5.3 redraw
// assertRedrawSelection(winners, participantNos)
//   winners:        이 회차의 당첨 기록 전부
//   participantNos: 발표 화면에서 고른 번호들 (여러 개 가능. D-18 「선택 번호 재추첨」)
//   1. participantNos 가 비어 있으면 throw new Error("INVALID_WINNER_SELECTION")
//   2. 하나라도 「이 회차에서 status = 'pending' 인 당첨자」가 아니면 같은 오류
//      (이미 absent 로 바꾼 번호를 또 고르거나, 다른 회차 번호를 보내는 경우)
//   3. 같은 번호가 두 번 들어 있으면 같은 오류

// ── 함수 4: 지급 처리를 해도 되는가 ──────────────────
// assertCanGiveGift(draw)
//   draw.status 가 'confirmed' 가 아니면 throw new Error("DRAW_NOT_CONFIRMED")
//   「이미 지급됨(ALREADY_GIVEN)」은 여기서 보지 않는다. DB 의 조건부 갱신(gift_given_at is null)이
//   맡는다 (D-11). 두 운영자가 동시에 눌러도 DB 가 한 번만 받아 주기 때문이다.

// ── 함수 5: 지금 차례인 경품 ──────────────────────────  spec 6장 「경품 순서」
// currentPrize(prizes, draws) → PrizeRow | null
//   prizes 를 sort 오름차순으로 보고, 「status = 'confirmed' 인 회차가 없는」 첫 경품을 돌려준다.
//   뽑는 중(pending)인 경품은 아직 확정 전이므로 그 경품이 그대로 「지금 차례」다 (새로고침해도 임시 결과가 보임, D-10).
//   전부 확정했으면 null (발표 화면이 「모든 추첨이 끝났습니다」를 보여 준다).
//   발표 화면 페이지와 GET /api/admin/draws 가 같이 쓴다. [다음 경품 →]은 계산 없이 화면만 다시 그린다.
//   확정된 경품을 다시 추첨하는 것은 함수 1 이 막는다 (10/15 결정).

// ── 함수 6: 확정 후 당첨자 상태 ───────────────────────  spec 5.3 confirm
// confirmedWinners(winners) → WinnerRow[]
//   'pending' 은 'confirmed' 로 바꾸고, 'absent' 는 그대로 둔다. 새 배열을 돌려준다.
//   Route Handler 가 이 결과대로 update 한다.
//
// 오류를 코드 문자열로 throw 하는 이유: draw.ts 와 같다. 함수 이름이 assert 로 시작하면
// 「통과하면 아무 일 없고, 아니면 던진다」는 뜻.
