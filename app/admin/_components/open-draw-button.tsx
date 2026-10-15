"use client";

// [발표 화면 열기] 버튼 (클라이언트). spec 3.3 상단 버튼, A-09
// 창 이름을 붙여 연다. 같은 이름의 창이 이미 있으면 브라우저가 새로 만들지 않고 그 창을 쓴다.
// 발표 화면이 두 개 열리면 서로 다른 단계를 보여 주며 헷갈릴 수 있기 때문이다.
// 창 크기는 정하지 않는다. 운영자가 프로젝터 쪽 모니터로 옮긴 뒤 F11 로 전체 화면을 만든다.
// 새 창은 같은 로그인 쿠키를 쓰므로 다시 로그인하지 않는다 (spec 3.6).
const WINDOW_NAME = "kcim-draw-screen";

export function OpenDrawButton() {
  return (
    <button className="btn-ghost btn-primary" onClick={() => window.open("/admin/draw", WINDOW_NAME)?.focus()}>
      발표 화면 열기
    </button>
  );
}
