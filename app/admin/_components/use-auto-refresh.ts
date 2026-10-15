"use client";

// 콘솔 자동 갱신 규칙 (클라이언트 훅). spec 3.3 「자동 갱신」, A-06
//
// 「다시 불러오는 함수」를 받아 아래 규칙대로 불러 준다. 화면 코드와 타이머 코드를 섞지 않으려고 따로 둔다.
//   ① 스위치가 켜져 있으면 1분마다 다시 불러온다.
//   ② 탭이 안 보이면 멈춘다. 다시 보이면 바로 한 번 불러오고 1분 간격을 다시 시작한다.
//   ③ 스위치를 켠 지 30분이 지나면 끈다. 탭이 안 보이던 시간도 포함한다.
// 콘솔을 열면 켜진 상태로 시작한다 (spec 3.3).
//
// reload 는 화면에서 useCallback 으로 감싸야 한다. 아니면 그릴 때마다 타이머가 새로 만들어진다.
// [새로고침] 버튼은 이 훅과 상관없다.
import { useCallback, useEffect, useState } from "react";

const INTERVAL_MS = 60 * 1000;
const AUTO_OFF_MS = 30 * 60 * 1000;

export function useAutoRefresh(reload: () => void): { enabled: boolean; setEnabled: (on: boolean) => void } {
  const [enabled, setEnabledState] = useState(true);
  // 「켠 시각」. 다시 켜면 30분을 처음부터 센다.
  const [enabledAt, setEnabledAt] = useState(() => Date.now());

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    if (on) setEnabledAt(Date.now());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const expired = () => Date.now() - enabledAt >= AUTO_OFF_MS;

    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => {
        if (expired()) setEnabledState(false);
        else reload();
      }, INTERVAL_MS);
    };

    // 탭이 안 보이는 동안에는 타이머가 없으므로 30분 확인은 다시 보일 때 한다.
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (expired()) {
        setEnabledState(false);
      } else {
        reload();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, enabledAt, reload]);

  return { enabled, setEnabled };
}
