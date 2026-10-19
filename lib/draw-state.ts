// lib/draw-state.ts — 회차 상태 전이 규칙 (순수 함수, 단위 테스트 대상)
//
// DB 를 읽지 않는다. 회차(draws)·당첨 기록(draw_winners)·경품 목록을 인자로 받아
// 「이 조작을 해도 되는가」만 판정한다. 실제 갱신은 Route Handler 가 한다.
//
// 오류를 코드 문자열로 throw 하는 이유: draw.ts 와 같다. 함수 이름이 assert 로 시작하면
// 「통과하면 아무 일 없고, 아니면 던진다」는 뜻.

// 상태 값과 열 이름은 DB(spec 4장)와 같다. 판정에 필요한 열만 둔다.
export type DrawStatus = "pending" | "confirmed";
export type WinnerStatus = "pending" | "confirmed" | "absent";

export type DrawRow = { id: number; prize_id: number; status: DrawStatus };
export type WinnerRow = {
  draw_id: number;
  participant_no: number;
  status: WinnerStatus;
};
export type PrizeRow = { id: number; sort: number };

// spec 6장 「회차 상태」「경품 순서」
export function assertCanStartDraw(draws: DrawRow[], prizeId: number): void {
  // 임시 결과를 확정하지 않고 다음 경품으로 넘어가면 어느 쪽이 진짜 결과인지 알 수 없다 (D-18)
  if (draws.some((d) => d.status === "pending")) {
    throw new Error("DRAW_PENDING_EXISTS");
  }
  // 같은 경품을 두 번 추첨하면 당첨자가 두 묶음 생긴다. 잘못 확정한 회차는 DB 에서 지운다 (10/15 결정)
  if (draws.some((d) => d.prize_id === prizeId && d.status === "confirmed")) {
    throw new Error("PRIZE_ALREADY_DRAWN");
  }
}

// 재추첨과 확정 둘 다 이 검사를 먼저 거친다.
export function assertPending(draw: DrawRow): void {
  if (draw.status !== "pending") {
    throw new Error("DRAW_NOT_PENDING");
  }
}

// spec 5.3 redraw. participantNos 는 발표 화면에서 고른 번호들이다 (D-18 「선택 번호 재추첨」).
// 전부 「이 회차에서 status = 'pending' 인 당첨자」여야 하고 중복이 없어야 한다.
export function assertRedrawSelection(winners: WinnerRow[], participantNos: number[]): void {
  const pendingNos = new Set(winners.filter((w) => w.status === "pending").map((w) => w.participant_no));
  const valid =
    participantNos.length > 0 &&
    new Set(participantNos).size === participantNos.length &&
    participantNos.every((no) => pendingNos.has(no));

  if (!valid) {
    throw new Error("INVALID_WINNER_SELECTION");
  }
}

// spec 6장 「경품 순서」. sort 오름차순으로 「confirmed 회차가 없는」 첫 경품. 전부 확정했으면 null.
// 뽑는 중(pending)인 경품은 확정 전이므로 그 경품이 그대로 「지금 차례」다 (D-10).
// 발표 화면 페이지와 GET /api/admin/draws 가 같이 쓴다.
export function currentPrize<P extends PrizeRow>(prizes: P[], draws: DrawRow[]): P | null {
  const confirmedPrizeIds = new Set(draws.filter((d) => d.status === "confirmed").map((d) => d.prize_id));
  const ordered = [...prizes].sort((a, b) => a.sort - b.sort);
  return ordered.find((p) => !confirmedPrizeIds.has(p.id)) ?? null;
}

// spec 5.3 confirm. pending 은 confirmed 로, absent 는 그대로. Route Handler 가 이 결과대로 update 한다.
export function confirmedWinners(winners: WinnerRow[]): WinnerRow[] {
  return winners.map((w) => (w.status === "pending" ? { ...w, status: "confirmed" } : { ...w }));
}

// ── 경품 목록 변경 내용 나누기 ───────────────────────  spec 5.3 PUT prizes, A-12
//
// 콘솔은 [저장]을 누르면 「화면에 보이는 표 전체」를 보낸다 (spec 5.3 「통째로 저장」).
// DB 에는 「표 전체를 이걸로 바꿔라」라는 명령이 없으므로, 지금 표와 비교해 줄마다 추가·수정·삭제로 나눈다.
// 나누는 김에 「이미 추첨한 경품은 수정·삭제할 수 없다」(A-12) 규칙도 여기서 검사한다.
//
// 「이미 추첨한 경품」: [추첨 시작]을 한 번이라도 누른 경품. 확정 전 임시 회차만 있어도 포함한다.
//   ① 임시 결과가 있는 경품을 지우면 DB 가 거부해서 500 이 난다.
//   ② 추첨 도중에 당첨 인원을 바꾸면 발표 화면의 「N명 추첨」과 실제 결과가 어긋난다.
//
// 검사 순서는 1(내용이 올바른가) → 2(이미 추첨했는가)다. 테스트로 이 순서를 고정한다.

// 경품 한 줄 (API 이름, camelCase)
// 등급은 따로 두지 않고 「5등 커피」처럼 이름에 적는다 (DB 에 rank 열은 없다).
// imageUrl 은 발표 화면 경품 소개에 보여 줄 사진 주소. 없으면 null (D-21).
export type PrizeRecord = { id: number; name: string; winnerCount: number; sort: number; imageUrl: string | null };
export type NewPrize = Omit<PrizeRecord, "id">;

// 사진 주소는 http(s) 로 시작하는 2000자 이하 문자열만 받는다. 빈 문자열은 「없음」이다.
const IMAGE_URL_MAX = 2000;
function parseImageUrl(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") throw new Error("INVALID_BODY");
  const url = raw.trim();
  if (url === "") return null;
  if (url.length > IMAGE_URL_MAX || !/^https?:\/\//i.test(url)) throw new Error("INVALID_IMAGE_URL");
  return url;
}
export type PrizeChanges = { toInsert: NewPrize[]; toUpdate: PrizeRecord[]; toDelete: number[] };

// 화면이 보낸 한 줄을 검사해 다듬는다. id 가 없으면 새 줄이다.
function parsePrizeInput(raw: unknown): NewPrize & { id: number | null } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("INVALID_BODY");
  const r = raw as Record<string, unknown>;

  if (!Number.isInteger(r.winnerCount) || (r.winnerCount as number) < 1) throw new Error("INVALID_WINNER_COUNT");

  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (name === "" || !Number.isInteger(r.sort)) throw new Error("INVALID_BODY");

  let id: number | null = null;
  if (r.id !== undefined && r.id !== null) {
    if (!Number.isInteger(r.id)) throw new Error("INVALID_BODY");
    id = r.id as number;
  }

  return { id, name, winnerCount: r.winnerCount as number, sort: r.sort as number, imageUrl: parseImageUrl(r.imageUrl) };
}

const samePrize = (a: NewPrize, b: NewPrize) =>
  a.name === b.name && a.winnerCount === b.winnerCount && a.sort === b.sort && (a.imageUrl ?? null) === (b.imageUrl ?? null);

export function splitPrizeChanges(current: PrizeRecord[], submitted: unknown[], drawnPrizeIds: number[]): PrizeChanges {
  const currentById = new Map(current.map((p) => [p.id, p]));

  // 1. 내용 검사. 하나라도 틀리면 바로 멈춘다.
  const parsed = submitted.map(parsePrizeInput);
  const seenIds = new Set<number>();
  for (const p of parsed) {
    if (p.id === null) continue;
    // DB 에 없는 번호(다른 창에서 이미 지운 경품)나 같은 번호 두 번
    if (!currentById.has(p.id) || seenIds.has(p.id)) throw new Error("INVALID_BODY");
    seenIds.add(p.id);
  }

  // 2. 이미 추첨한 경품은 그대로여야 한다. 빠졌으면 삭제하려는 것이다.
  const submittedById = new Map(parsed.filter((p) => p.id !== null).map((p) => [p.id as number, p]));
  for (const drawnId of drawnPrizeIds) {
    const before = currentById.get(drawnId);
    if (!before) continue;
    const after = submittedById.get(drawnId);
    if (!after || !samePrize(before, after)) throw new Error("PRIZE_ALREADY_DRAWN");
  }

  // 3. 세 묶음으로 나눈다. 값이 그대로인 줄은 어디에도 넣지 않는다.
  const toInsert: NewPrize[] = [];
  const toUpdate: PrizeRecord[] = [];
  for (const { id, ...values } of parsed) {
    if (id === null) toInsert.push(values);
    else if (!samePrize(currentById.get(id)!, values)) toUpdate.push({ id, ...values });
  }
  const toDelete = current.filter((p) => !submittedById.has(p.id)).map((p) => p.id);

  return { toInsert, toUpdate, toDelete };
}

// ── 경품 표 순서 ─────────────────────────────────────  spec 3.3 「경품 목록」
// 추첨 순서는 콘솔 표의 줄 순서다. 운영자는 순서 숫자를 입력하지 않고 [↑][↓]로 줄을 옮긴다.
// 이미 추첨한 경품은 sort 를 바꾸면 PRIZE_ALREADY_DRAWN 이므로 맨 위에 고정하고 sort 를 그대로 둔다.
type OrderedPrize = { drawn: boolean; sort: number | null };

// 편집 화면의 처음 줄 순서. 추첨한 경품을 맨 위로, 각 묶음 안에서는 받은 순서(sort 순)를 유지한다.
export function orderPrizesForEditing<P extends OrderedPrize>(prizes: P[]): P[] {
  return [...prizes.filter((p) => p.drawn), ...prizes.filter((p) => !p.drawn)];
}

// 저장할 sort. 줄 순서대로 받는다. 추첨한 경품은 sort 그대로, 나머지는 그중 가장 큰 값 다음부터 1씩 늘린다.
export function assignPrizeSorts(rows: OrderedPrize[]): number[] {
  let next = Math.max(0, ...rows.filter((r) => r.drawn).map((r) => r.sort ?? 0)) + 1;
  return rows.map((r) => (r.drawn && r.sort !== null ? r.sort : next++));
}
