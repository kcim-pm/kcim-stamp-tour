"use client";

// 추첨 설정을 두 창이 나눠 쓰는 훅 (클라이언트). spec 3.3 「추첨 설정」, 이슈 #4
// 관리자 콘솔이 고치고 발표 화면이 읽는다. 값의 형식과 검사는 lib/draw-settings.ts 가 정한다.
// 다른 창에서 저장소를 고치면 브라우저가 storage 이벤트를 보내므로, 발표 화면은 새로고침 없이 바로 바뀐 값을 쓴다.
// 사생활 보호 모드 등으로 저장소를 쓸 수 없으면 이 창 안에서만 기억한다(그때는 두 창이 따로 논다).
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_DRAW_SETTINGS, parseDrawSettings, type DrawSettings } from "@/lib/draw-settings";

const SETTINGS_KEY = "kcim-draw-settings";

function readSettings(): DrawSettings {
  try {
    return parseDrawSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return DEFAULT_DRAW_SETTINGS;
  }
}

export function useDrawSettings(): [DrawSettings, (next: DrawSettings) => void] {
  // 서버에서 그린 첫 화면과 맞추려고 기본값으로 시작하고, 붙은 뒤에 저장소 값을 읽는다.
  const [settings, setSettings] = useState<DrawSettings>(DEFAULT_DRAW_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY || e.key === null) setSettings(readSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: DrawSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // 저장소를 못 쓰면 이 창에서만 바뀐다.
    }
  }, []);

  return [settings, save];
}
