// lib/admin-fetch.ts — 관리자 화면이 API 를 부를 때 쓰는 도우미 (브라우저 전용, 테스트 대상 아님)
//
// 콘솔과 발표 화면이 API 를 부를 때마다 반복되는 일을 모은다.
// 401 일 때 window.location 을 바꾸므로 서버 코드에서 부르면 안 된다.
// 화면 부품이 아니라서 components/ 가 아니라 lib/ 에 둔다 (spec 7.6).

// "NETWORK" 는 서버가 보내는 코드가 아니라 화면에서만 쓰는 값이다.
export type AdminResult<T> = { ok: true; data: T } | { ok: false; code: string };

export async function adminFetch<T = unknown>(
  url: string,
  init?: { method?: string; body?: unknown },
): Promise<AdminResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, code: "NETWORK" };
  }

  // 로그인이 풀렸다(12시간 지남, 다른 창에서 로그아웃). 로그인 뒤 지금 화면으로 돌아오게 한다 (spec 3.6).
  if (res.status === 401) {
    const next = window.location.pathname + window.location.search;
    window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
    return { ok: false, code: "UNAUTHORIZED" };
  }

  if (res.status === 204) return { ok: true, data: undefined as T };

  try {
    const body = await res.json();
    if (res.ok) return { ok: true, data: body as T };
    return { ok: false, code: typeof body?.error === "string" ? body.error : "NETWORK" };
  } catch {
    // 서버가 JSON 이 아닌 오류 페이지를 돌려준 경우
    return { ok: false, code: "NETWORK" };
  }
}

// 콘솔과 발표 화면이 같은 문구를 쓰도록 한 곳에서 정한다.
const MESSAGES: Record<string, string> = {
  NETWORK: "연결에 실패했습니다. 다시 시도해 주세요",
  PRIZE_ALREADY_DRAWN: "이미 추첨한 경품은 바꿀 수 없습니다",
  NOT_ENOUGH_CANDIDATES: "추첨할 후보가 없습니다",
  DRAW_PENDING_EXISTS: "확정하지 않은 추첨이 있습니다",
  INVALID_WINNER_COUNT: "당첨 인원은 1 이상의 정수여야 합니다",
  INVALID_IMAGE_URL: "경품 사진 주소는 http:// 또는 https:// 로 시작해야 합니다",
  INVALID_WINNER_SELECTION: "선택한 번호를 처리할 수 없습니다. 새로고침해 주세요",
};

// 모르는 코드는 함께 보여 준다. 현장에서 개발자에게 물어볼 때 원인을 바로 알 수 있게.
export function errorMessage(code: string): string {
  return MESSAGES[code] ?? `처리하지 못했습니다 (${code})`;
}
