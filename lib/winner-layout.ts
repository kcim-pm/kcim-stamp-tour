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

// 번호마다 릴이 멈추는 차례. 처음 추첨 때는 자리 순서대로 첫 칸부터 하나씩 멈춘다 (reelStopAt 의 slotOrder).
// 재추첨 번호(fresh)는 맨 끝에 붙으므로 자리 순서를 쓰면 20명일 때 앞 칸 19개를 다 기다리게 된다.
// 그래서 재추첨 번호는 그 묶음 안에서만 0부터 센다. 이미 서 있는 번호의 차례는 바뀌어도 다시 돌지 않는다.
export function winnerEnterOrder(nos: number[], fresh: Set<number>): number[] {
  let freshIndex = 0;
  return nos.map((no, i) => (fresh.has(no) ? freshIndex++ : i));
}

// ── 릴 연출 (spec 3.4 「추첨 중」, 마케팅팀 피드백 10/22) ──────────────────
// 당첨 칸 N 개가 처음부터 각자 세 자리 릴로 돌고, 첫 칸부터 하나씩 멈춘다. 칸 안에서는 백→십→일 순이다.
// 한 칸이 다 멈추면 MC 가 그 번호를 발표할 시간을 두고 다음 칸이 멈추기 시작한다.
export const REEL_SPIN_MS = 1500; // 첫 칸의 백의 자리가 멈추기까지 전부가 도는 시간
export const REEL_DIGIT_GAP_MS = 500; // 한 칸 안에서 자릿수가 차례로 멈추는 간격
export const REEL_STOP_MS = 600; // 자릿수 하나가 감속해 멈추는 데 걸리는 시간 (globals.css reel-settle 과 같아야 한다)
export const REEL_SLOT_GAP_MS = 1000; // 한 칸이 다 멈춘 뒤 다음 칸이 멈추기 시작할 때까지 (번호 발표 시간)

// 무대의 릴은 세 자리 고정이라 앞을 0 으로 채운다 (3 → "003"). 우측 당첨 현황 칩은 그대로 3 이다.
export function padNo(no: number): string {
  return String(no).padStart(3, "0");
}

// slotOrder 번째 칸의 digit(0 백, 1 십, 2 일) 자리가 멈추기 시작하는 시각 (연출 시작 기준 ms)
export function reelStopAt(slotOrder: number, digit: number): number {
  const slotDuration = 2 * REEL_DIGIT_GAP_MS + REEL_STOP_MS;
  return REEL_SPIN_MS + slotOrder * (slotDuration + REEL_SLOT_GAP_MS) + digit * REEL_DIGIT_GAP_MS;
}

// 칸 count 개가 전부 멈추는 시각. 발표 화면은 이때 「추첨 중」을 끝낸다.
export function reelTotalMs(count: number): number {
  const n = Math.max(1, Math.floor(count));
  return reelStopAt(n - 1, 2) + REEL_STOP_MS;
}
