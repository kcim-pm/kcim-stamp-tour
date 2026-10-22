// lib/draw-settings.ts — 추첨 설정 (순수 함수, 단위 테스트 대상). spec 3.3 「추첨 설정」, A-10, 이슈 #4
//
// 관객에게 보이지 않도록 추첨 설정은 관리자 콘솔에서 고치고, 발표 화면은 읽기만 한다.
// 두 창은 같은 브라우저의 같은 주소에서 열리므로 브라우저 저장소(localStorage)로 주고받는다. DB 에는 저장하지 않는다.
// 저장소 값은 사람이 고칠 수도 있고 예전 형식일 수도 있으므로, 읽을 때 검사하고 틀리면 기본값으로 둔다.

export type DrawSettings = {
  excludePrevious: boolean; // 이전 당첨자 제외 (A-10)
};

export const DEFAULT_DRAW_SETTINGS: DrawSettings = { excludePrevious: true };

export function parseDrawSettings(raw: string | null): DrawSettings {
  let value: unknown;
  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    value = null;
  }
  if (typeof value !== "object" || value === null) return DEFAULT_DRAW_SETTINGS;

  const v = value as Record<string, unknown>;
  return {
    excludePrevious: typeof v.excludePrevious === "boolean" ? v.excludePrevious : DEFAULT_DRAW_SETTINGS.excludePrevious,
  };
}
