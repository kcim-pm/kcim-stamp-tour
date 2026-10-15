// tests/draw-state.test.ts — lib/draw-state.ts 가 풀어야 할 문제
//
// 회차·당첨 기록은 필요한 열만 가진 작은 객체로 만든다. 예: { id: 1, prize_id: 1, status: "pending" }

// describe: 새 추첨 시작
//   it: pending 회차가 있으면 DRAW_PENDING_EXISTS
//   it: 다른 경품의 회차가 전부 confirmed 면 통과
//   it: 회차가 하나도 없으면 통과
//   it: 같은 경품에 confirmed 회차가 있으면 PRIZE_ALREADY_DRAWN (10/15 결정)
//       회차 [{prize_id:1, status:"confirmed"}], prizeId 1 → throw
//   it: pending 회차와 같은 경품 confirmed 회차가 둘 다 있으면 DRAW_PENDING_EXISTS 가 먼저다

// describe: 재추첨·확정 가능 여부
//   it: pending 회차는 통과
//   it: confirmed 회차는 DRAW_NOT_PENDING

// describe: 재추첨 대상 검사
//   it: 이 회차의 pending 당첨자만 골랐으면 통과 (여러 명도 통과)
//   it: 빈 목록이면 INVALID_WINNER_SELECTION
//   it: 이미 absent 인 번호를 고르면 INVALID_WINNER_SELECTION
//   it: 이 회차에 없는 번호를 고르면 INVALID_WINNER_SELECTION
//   it: 같은 번호를 두 번 보내면 INVALID_WINNER_SELECTION

// describe: 지급 가능 여부
//   it: confirmed 회차는 통과
//   it: pending 회차는 DRAW_NOT_CONFIRMED

// describe: 지금 차례인 경품
//   it: 확정 회차가 없는 경품 중 sort 가 가장 작은 것
//       경품 [A(sort1), B(sort2), C(sort3)], 확정 회차 [A] → B
//   it: pending 회차만 있는 경품은 아직 추첨하지 않은 것으로 본다
//       경품 [A, B], A 에 pending 회차만 → A
//   it: 전부 확정했으면 null
//   it: 경품 목록이 비어 있으면 null

// describe: 확정 후 당첨자 상태
//   it: pending 은 confirmed 로 바뀐다
//   it: absent 는 그대로다
//   it: 원본 배열을 바꾸지 않는다
