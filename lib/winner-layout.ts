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
