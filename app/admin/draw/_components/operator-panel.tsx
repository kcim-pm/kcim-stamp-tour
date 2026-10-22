"use client";

// 운영자 패널 (클라이언트). spec 3.4 「운영자 패널」, D-20, 이슈 #4
// Tab 으로 여닫는 단축키 안내다. 발표 화면에는 버튼이 없으므로 어느 키로 무엇을 하는지 여기서 본다.
// 추첨 설정(이전 당첨자 제외)은 관객에게 보이지 않도록 관리자 콘솔로 옮겼다. 당첨 인원은 경품 목록의 인원을 쓴다.
// 관객 화면에도 함께 비치므로 필요한 순간에만 열고 바로 닫는다.
// 지금 단계에 맞지 않는 키는 흐리게 보인다. Space 처럼 단계마다 동작이 다른 키는 둘 중 하나라도 되면 진하게 보인다.
import type { DrawAction } from "@/lib/draw-keys";

const KEYS: { actions: DrawAction[]; key: string; label: string }[] = [
  { actions: ["start", "redraw"], key: "Space", label: "추첨 시작 · 고른 번호 재추첨" },
  { actions: ["confirm"], key: "Enter", label: "당첨 확정" },
  { actions: ["next"], key: "→", label: "다음 경품" },
  { actions: ["panel"], key: "Tab", label: "단축키 안내" },
  { actions: ["escape"], key: "Esc", label: "닫기 · 선택 해제" },
];

type Props = {
  allowed: (action: DrawAction) => boolean;
  onClose: () => void;
};

export function OperatorPanel(p: Props) {
  return (
    <section className="panel" aria-label="단축키 안내">
      <div className="panel__row">
        <span className="panel__tag">단축키 안내</span>
        <button type="button" className="panel__close" onClick={p.onClose}>
          닫기 (Tab)
        </button>
      </div>
      <ul className="keys">
        {KEYS.map((k) => (
          <li key={k.key} className={k.actions.some(p.allowed) ? undefined : "is-off"}>
            <kbd>{k.key}</kbd>
            <span>{k.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
