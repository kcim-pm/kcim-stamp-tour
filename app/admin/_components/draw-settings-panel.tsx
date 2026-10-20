"use client";

// 추첨 설정 (클라이언트). spec 3.3 「추첨 설정」, A-10, 이슈 #4
// 관객이 보는 발표 화면에 설정이 비치지 않도록 콘솔에서 고친다. 발표 화면은 Space 로 추첨을 시작할 때 이 값을 쓴다.
import { useDrawSettings } from "./use-draw-settings";

export function DrawSettingsPanel() {
  const [settings, saveSettings] = useDrawSettings();

  return (
    <section className="console-section" id="draw-settings">
      <h2>추첨 설정</h2>
      <p className="hint" style={{ margin: 0 }}>
        발표 화면에서 Space 로 추첨을 시작할 때 이 설정을 씁니다. 발표 화면에는 보이지 않습니다.
      </p>
      <div className="console-row">
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.excludePrevious}
            onChange={(e) => saveSettings({ ...settings, excludePrevious: e.target.checked })}
          />
          <span className="switch-track" />
          이전 당첨자 제외
        </label>
      </div>
    </section>
  );
}
