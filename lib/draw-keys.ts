// lib/draw-keys.ts — 발표 화면의 키보드 조작 규칙 (순수 함수, 단위 테스트 대상)
//
// 발표 화면에는 버튼이 없다 (spec 3.4 「조작」, D-20). 운영자는 무대 옆 노트북 키보드로만 조작한다.
// 어느 키가 어느 동작인지, 지금 단계에서 그 동작을 해도 되는지를 여기서 정한다. 화면은 이 판정대로만 움직인다.

export type DrawPhase = "ready" | "drawing" | "result" | "confirmed" | "done";
export type DrawAction = "start" | "confirm" | "redraw" | "next" | "panel" | "escape";

export type KeyContext = {
  phase: DrawPhase;
  busy: boolean; // 서버 요청 중. 두 번 눌러 회차가 두 개 생기는 것을 막는다
  selectedCount: number; // 결과 단계에서 부재자로 고른 번호 수
};

// KeyboardEvent.key → 동작. Space 는 단계에 따라 달라서 keyToAction 에서 정한다.
const KEY_ACTIONS: Record<string, DrawAction> = {
  Enter: "confirm",
  ArrowRight: "next",
  Tab: "panel",
  Escape: "escape",
  // 옛 브라우저·일부 입력 장치가 보내는 이름
  Right: "next",
  Esc: "escape",
};

// Space 하나로 진행한다. 결과(임시) 단계에서는 고른 번호 재추첨, 그 밖에는 추첨 시작이다.
export function keyToAction(key: string, phase: DrawPhase): DrawAction | null {
  if (key === " ") return phase === "result" ? "redraw" : "start";
  return KEY_ACTIONS[key] ?? null;
}

// 단계와 상태에 맞는 동작만 허용한다. 버튼이 disabled 였던 것과 같은 규칙이다.
export function isActionAllowed(action: DrawAction, ctx: KeyContext): boolean {
  // 패널 여닫기와 닫기는 언제나 된다. 요청 중이어도 패널은 닫을 수 있어야 한다.
  if (action === "panel" || action === "escape") return true;
  if (ctx.busy) return false;

  switch (action) {
    case "start":
      return ctx.phase === "ready";
    case "confirm":
      return ctx.phase === "result";
    case "redraw":
      return ctx.phase === "result" && ctx.selectedCount > 0;
    case "next":
      return ctx.phase === "confirmed";
  }
}
