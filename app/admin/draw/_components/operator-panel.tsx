"use client";

// 운영자 패널 (클라이언트). spec 3.4 「운영자 패널」, A-11, D-04, D-20
// Tab 으로 여닫는다. 
// 발표 화면에는 버튼이 없으므로 운영자가 볼 것(단계, 후보 수, 단축키)과 고칠 것(이전 당첨자 제외, 당첨 인원)을 여기에 모은다. 
// 관객 화면에도 함께 비치므로 필요한 순간에만 열고 바로 닫는다.
// 단축키 표에서 지금 단계에 맞지 않는 키는 흐리게 보인다.
import type { DrawAction, DrawPhase } from "@/lib/draw-keys";

const PHASE_LABEL: Record<DrawPhase, string> = {
  ready: "준비",
  drawing: "추첨 중",
  result: "결과 확인",
  confirmed: "확정",
  done: "종료",
};

const KEYS: { action: DrawAction; key: string; label: string }[] = [
  { action: "start", key: "Space", label: "추첨 시작" },
  { action: "confirm", key: "Enter", label: "당첨 확정" },
  { action: "redraw", key: "R", label: "선택 번호 재추첨" },
  { action: "pause", key: "P", label: "일시정지 · 계속" },
  { action: "next", key: "→", label: "다음 경품" },
  { action: "history", key: "H", label: "이전 결과" },
  { action: "panel", key: "Tab", label: "운영자 패널" },
  { action: "escape", key: "Esc", label: "닫기 · 선택 해제" },
];

type Props = {
  phase: DrawPhase;
  paused: boolean;
  candidateCount: number;
  excludePrevious: boolean;
  onExcludePrevious: (on: boolean) => void;
  countInput: string;
  onCountInput: (value: string) => void;
  canEdit: boolean; // 준비 단계에서만 인원과 스위치를 고친다
  allowed: (action: DrawAction) => boolean;
  onClose: () => void;
};

export function OperatorPanel(p: Props) {
  return (
    <section className="panel" aria-label="운영자 패널">
      <div className="panel__row">
        <span className="panel__tag">운영자 패널</span>
        <span className="panel__state">
          단계 <strong>{PHASE_LABEL[p.phase] + (p.paused ? " (일시정지)" : "")}</strong>
        </span>
        <span className="panel__state">
          추첨 후보 <strong>{p.candidateCount}</strong>명
        </span>
        <label className="switch panel__switch">
          <input
            type="checkbox"
            checked={p.excludePrevious}
            disabled={!p.canEdit}
            onChange={(e) => p.onExcludePrevious(e.target.checked)}
          />
          <span className="switch-track" />
          이전 당첨자 제외
        </label>
        <label className="panel__field">
          당첨 인원{" "}
          <input
            type="number"
            min={1}
            value={p.countInput}
            disabled={!p.canEdit}
            onChange={(e) => p.onCountInput(e.target.value)}
          />{" "}
          명
        </label>
        <button type="button" className="panel__close" onClick={p.onClose}>
          닫기 (Tab)
        </button>
      </div>
      <ul className="keys">
        {KEYS.map((k) => (
          <li key={k.action} className={p.allowed(k.action) ? undefined : "is-off"}>
            <kbd>{k.key}</kbd>
            <span>{k.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
