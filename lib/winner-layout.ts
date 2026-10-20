// lib/winner-layout.ts — 당첨 번호의 크기와 배치 (순수 함수, 단위 테스트 대상)
//
// 번호는 상자 없이 숫자만 크게 놓는다 (spec 3.4 「당첨 번호 배치」). 인원이 적을수록 크게, 많을수록 작게 놓아
// 1명이든 20명이든 무대 안에 들어가고 뒷줄에서도 읽히게 한다 (디자인 캔버스 「결과 확인 (확정 · 안 A)」).
// 값은 1280×720 기준 px 이고, 화면에서는 그대로 font-size 로 쓴다.

export type WinnerLayout = {
  kind: "single" | "pair" | "grid";
  size: number; // 글자 크기 px
  cols: number; // 격자 열 수. single·pair 는 인원과 같다
};

export function winnerLayout(count: number): WinnerLayout {
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return { kind: "single", size: 200, cols: 1 };
  if (n === 2) return { kind: "pair", size: 160, cols: 2 };
  if (n <= 5) return { kind: "grid", size: 120, cols: n };
  if (n <= 10) return { kind: "grid", size: 96, cols: 5 };
  if (n <= 20) return { kind: "grid", size: 72, cols: 5 };
  return { kind: "grid", size: 56, cols: 10 };
}

// 당첨 번호를 놓는 순서 (spec 3.4 「동작 규칙」).
// 처음 뽑힌 번호는 오름차순, 재추첨으로 뽑힌 번호는 그 뒤에 재추첨한 순서대로 붙인다. 묶음 안에서는 오름차순.
// 재추첨 번호가 사이에 끼어들면 어느 번호가 새로 뽑혔는지 관객이 헷갈린다 (이슈 #6).
// nos 는 지금 서 있는 번호(부재자 제외), redraws 는 재추첨 한 번마다 새로 뽑힌 번호 묶음이다.
// 뽑힌 순서는 DB 에 없어서 redraws 는 발표 화면이 기억한다. 새로고침하면 빈 목록이 되어 전부 오름차순이다.
export function winnerDisplayOrder(nos: number[], redraws: number[][]): number[] {
  const standing = new Set(nos);
  const asc = (a: number, b: number) => a - b;
  const redrawn = new Set(redraws.flat());
  // 재추첨 번호가 다시 부재자로 빠졌으면 목록에 없으므로 건너뛴다.
  const later = redraws.flatMap((batch) => batch.filter((no) => standing.has(no)).sort(asc));
  return [...nos.filter((no) => !redrawn.has(no)).sort(asc), ...later];
}

// 번호마다 굴러 들어오는 차례. 화면은 차례 × 70ms 늦게 굴려 처음 추첨 때 번호가 하나씩 들어오게 한다.
// 재추첨 번호(fresh)는 맨 끝에 붙으므로 자리 순서를 쓰면 20명일 때 1.3초 동안 빈자리로 남는다.
// 그래서 재추첨 번호는 그 묶음 안에서만 0부터 센다. 이미 서 있는 번호의 차례는 바뀌어도 다시 굴러가지 않는다.
export function winnerEnterOrder(nos: number[], fresh: Set<number>): number[] {
  let freshIndex = 0;
  return nos.map((no, i) => (fresh.has(no) ? freshIndex++ : i));
}
