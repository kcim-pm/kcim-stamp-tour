// lib/draw.ts — 추첨 후보·재추첨 후보·무작위 추출 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 완주자 목록·당첨 기록·난수 함수를 전부 인자로 받는다.
// 난수를 인자로 받는 이유: 테스트에서 고정 난수를 넣으면 결과를 재현할 수 있다 (spec 8.1).
// 실제 서버는 Node 의 crypto.randomInt 를 넘긴다 (CLAUDE.md 「무작위는 서버의 crypto.randomInt」).

// ── 함수 1: 추첨 후보 ─────────────────────────────────  spec 6장 「추첨 후보」
// pickCandidates(completedNos, confirmedWinnerNos, excludePrevious) → number[]
//   completedNos:        완주자 참가번호 전체
//   confirmedWinnerNos:  이전 회차에서 status = 'confirmed' 인 참가번호 (absent 는 넣지 않는다)
//   excludePrevious:     true 면 confirmedWinnerNos 를 뺀다 (D-04 스위치)
//   1. excludePrevious 가 false 면 completedNos 그대로
//   2. true 면 completedNos 에서 confirmedWinnerNos 에 있는 번호를 뺀다
//   3. 순서는 completedNos 순서를 유지한다 (섞는 건 함수 3 이 한다)
//   부재자(absent)를 빼지 않는 이유: D-18 「다음 경품에서는 다시 후보가 된다」

// ── 함수 2: 재추첨 후보 ───────────────────────────────  spec 6장 「재추첨 후보」
// pickRedrawCandidates(candidates, thisDrawNos) → number[]
//   candidates:   함수 1 의 결과
//   thisDrawNos:  이 회차의 모든 당첨 기록 참가번호 (pending + absent 전부)
//   1. candidates 에서 thisDrawNos 에 있는 번호를 뺀다
//   같은 회차에서 이미 뽑힌 사람(남은 당첨자)과 방금 부재 처리한 사람 모두 다시 나오면 안 된다.

// ── 함수 3: 무작위 추출 ───────────────────────────────  spec 6장 「무작위성」「추첨 유효성」
// drawWinners(candidates, count, randomInt) → number[]
//   randomInt(max): 0 이상 max 미만 정수를 돌려주는 함수 (crypto.randomInt 와 같은 모양)
//   1. count 가 1 이상 정수가 아니면 throw new Error("INVALID_WINNER_COUNT")
//   2. candidates 가 비어 있으면 throw new Error("NOT_ENOUGH_CANDIDATES")
//      (뽑을 사람이 한 명도 없을 때만 오류. 10/15 결정)
//   3. candidates 를 복사한 뒤 Fisher-Yates 로 섞는다. 원본 배열은 바꾸지 않는다
//        i = 끝에서부터 1 까지: j = randomInt(i + 1), [i] 와 [j] 교환
//   4. 앞에서 min(count, candidates.length) 개를 돌려준다.
//      후보가 count 보다 적으면 후보 전원이 당첨 (거부하지 않는다. 10/15 결정, spec 6장 「추첨 유효성」)
//      순서는 뽑힌 순서 그대로 (발표 화면이 그 순서로 보여 준다)
//   같은 번호가 두 번 나올 수 없다: 섞고 앞에서 자르는 비복원 추출이므로.
//
// 오류를 코드 문자열로 throw 하는 이유: participant-no.ts 와 같은 방식. Route Handler 가
// catch 에서 코드를 보고 400/409 를 고른다.
