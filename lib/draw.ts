// lib/draw.ts — 추첨 후보·재추첨 후보·무작위 추출 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 완주자 목록·당첨 기록·난수 함수를 전부 인자로 받는다.
// 난수를 인자로 받는 이유: 테스트에서 고정 난수를 넣으면 결과를 재현할 수 있다 (spec 8.1).
// 실제 서버는 Node 의 crypto.randomInt 를 넘긴다 (CLAUDE.md 「무작위는 서버의 crypto.randomInt」).
//
// 오류를 코드 문자열로 throw 하는 이유: participant-no.ts 와 같은 방식. Route Handler 가
// catch 에서 코드를 보고 400/409 를 고른다.

// 0 이상 max 미만 정수를 돌려주는 함수 (crypto.randomInt 와 같은 모양)
export type RandomInt = (max: number) => number;

// spec 6장 「추첨 후보」
// confirmedWinnerNos 에는 이전 회차에서 confirmed 인 번호만 넘긴다.
// 부재자(absent)를 빼지 않는 이유: D-18 「다음 경품에서는 다시 후보가 된다」
// 완주자 순서를 그대로 유지한다. 섞는 것은 drawWinners 가 한다.
export function pickCandidates(
  completedNos: number[],
  confirmedWinnerNos: number[],
  excludePrevious: boolean,
): number[] {
  if (!excludePrevious) return [...completedNos];
  const excluded = new Set(confirmedWinnerNos);
  return completedNos.filter((no) => !excluded.has(no));
}

// spec 6장 「재추첨 후보」
// thisDrawNos 는 이 회차의 모든 당첨 기록(pending + absent)이다.
// 남은 당첨자와 방금 부재 처리한 사람 모두 같은 회차에서 다시 나오면 안 된다.
export function pickRedrawCandidates(candidates: number[], thisDrawNos: number[]): number[] {
  const excluded = new Set(thisDrawNos);
  return candidates.filter((no) => !excluded.has(no));
}

// spec 6장 「무작위성」「추첨 유효성」
// 섞고 앞에서 자르는 비복원 추출이므로 같은 번호가 두 번 나올 수 없다.
// 후보가 count 보다 적으면 후보 전원이 당첨이다 (10/15 결정). 뽑을 사람이 0명일 때만 오류.
// 돌려주는 순서는 뽑힌 순서 그대로다. DB 에는 순서를 저장하지 않고, 화면은 참가번호 순서로 보여 준다 (spec 3.4).
export function drawWinners(candidates: number[], count: number, randomInt: RandomInt): number[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("INVALID_WINNER_COUNT");
  }
  if (candidates.length === 0) {
    throw new Error("NOT_ENOUGH_CANDIDATES");
  }

  // Fisher-Yates. 원본 배열은 바꾸지 않는다.
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i >= 1; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
