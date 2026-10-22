import "server-only";
import { getSupabase } from "./supabase-server";
import { DbError, loadZones } from "./status-query";
import { isCompleted } from "./completion";
import { pickCandidates } from "./draw";
import type { DrawRow, DrawStatus, PrizeRecord, WinnerRow, WinnerStatus } from "./draw-state";

// lib/admin-query.ts — 관리자 API 들이 함께 쓰는 DB 조회 (서버 전용, 단위 테스트 대상 아님)
//
// DB 에서 읽어 규칙 함수(draw.ts, draw-state.ts)나 화면이 쓰기 좋은 모양으로 바꿔 준다. 규칙 판단은 하지 않는다.
// status.ts(계산)와 status-query.ts(DB 조회)를 나눈 것과 같은 이유로 나눈다.
// DB 오류는 DbError 로 던진다. API 는 이것을 500 DB_ERROR 로 바꾼다.

// ── 끝까지 나눠 읽기 ───────────────────────────────
// Supabase 는 한 번에 1000행까지만 주고, 잘려도 오류가 나지 않는다.
// visits 는 999명 × 5곳이면 약 5000행이라, 그냥 읽으면 완주자 수·추첨 후보·CSV 가 조용히 틀린다.
// 행이 많을 수 있는 표는 반드시 이 함수로 읽는다. 나눠 읽는 동안 순서가 같도록 query 는 기본키 순서로 정렬해야 한다.
const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function selectAll<T>(query: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new DbError(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// ── 완주자 번호 목록 ───────────────────────────────  spec 6장 「완주 판정」
export async function loadCompletedNos(): Promise<number[]> {
  const zoneCount = (await loadZones()).length;
  const visits = await selectAll<{ participant_no: number }>((from, to) =>
    getSupabase()
      .from("visits")
      .select("participant_no")
      .order("participant_no")
      .order("zone_id")
      .range(from, to),
  );

  const countByNo = new Map<number, number>();
  for (const v of visits) countByNo.set(v.participant_no, (countByNo.get(v.participant_no) ?? 0) + 1);

  return [...countByNo]
    .filter(([, count]) => isCompleted(count, zoneCount))
    .map(([no]) => no)
    .sort((a, b) => a - b);
}

// ── 회차 ───────────────────────────────────────────
// 회차마다 경품과 당첨 기록을 붙여 한 번에 읽는다. 회차는 경품 수 정도라 나눠 읽지 않는다.
export type DrawWithWinners = {
  id: number;
  prize_id: number;
  winner_count: number;
  exclude_previous: boolean;
  status: DrawStatus;
  created_at: string;
  confirmed_at: string | null;
  prize: { id: number; name: string };
  winners: { participant_no: number; status: WinnerStatus }[];
};

// prizes.image_url 열은 DB 에 남아 있지만 읽지 않는다 (경품 사진 삭제, 10/22).
const DRAW_COLUMNS =
  "id, prize_id, winner_count, exclude_previous, status, created_at, confirmed_at, " +
  "prize:prizes(id, name), winners:draw_winners(participant_no, status)";

export async function loadDraws(): Promise<DrawWithWinners[]> {
  const { data, error } = await getSupabase().from("draws").select(DRAW_COLUMNS).order("id");
  if (error) throw new DbError(error.message);
  return data as unknown as DrawWithWinners[];
}

// 없으면 null
export async function loadDraw(id: number): Promise<DrawWithWinners | null> {
  const { data, error } = await getSupabase().from("draws").select(DRAW_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new DbError(error.message);
  return data as unknown as DrawWithWinners | null;
}

// 규칙 함수(draw-state.ts)에 넘길 모양
export const toDrawRow = (d: DrawWithWinners): DrawRow => ({ id: d.id, prize_id: d.prize_id, status: d.status });
export const toWinnerRows = (d: DrawWithWinners): WinnerRow[] => d.winners.map((w) => ({ draw_id: d.id, ...w }));

export type DrawResponse = {
  id: number;
  prize: { id: number; name: string };
  winnerCount: number;
  excludePrevious: boolean;
  status: DrawStatus;
  createdAt: string;
  confirmedAt: string | null;
  winners: { participantNo: number; status: WinnerStatus }[];
};

// spec 5.3 회차 모양. 추첨·재추첨·확정 API 는 DB 를 고친 뒤 그 회차를 다시 읽어 이 모양으로 돌려준다.
// 당첨자는 참가번호 오름차순. 뽑힌 순서는 저장하지 않는다 (10/15 결정, spec 3.4·5.3).
export function toDrawResponse(d: DrawWithWinners): DrawResponse {
  return {
    id: d.id,
    prize: { id: d.prize.id, name: d.prize.name },
    winnerCount: d.winner_count,
    excludePrevious: d.exclude_previous,
    status: d.status,
    createdAt: d.created_at,
    confirmedAt: d.confirmed_at,
    winners: d.winners
      .map((w) => ({ participantNo: w.participant_no, status: w.status }))
      .sort((a, b) => a.participantNo - b.participantNo),
  };
}

// ── 추첨 후보 ───────────────────────────────────────  spec 6장 「추첨 후보」
// 이미 읽어 둔 회차 목록을 받아 쓴다. 완주자 목록도 이미 있으면 넘겨서 다시 읽지 않게 한다.
// 확정 당첨자만 모은다. 부재자는 다음 경품에서 다시 후보다 (D-18).
export async function loadCandidates(
  draws: DrawWithWinners[],
  excludePrevious: boolean,
  completedNos?: number[],
): Promise<number[]> {
  const completed = completedNos ?? (await loadCompletedNos());
  const confirmedNos = draws.flatMap((d) =>
    d.winners.filter((w) => w.status === "confirmed").map((w) => w.participant_no),
  );
  return pickCandidates(completed, confirmedNos, excludePrevious);
}

// ── 경품 목록 ───────────────────────────────────────
export type PrizeResponse = PrizeRecord & { drawn: boolean };

// 추첨 순서(sort, 같으면 id)대로. 이미 추첨한 경품 번호도 함께 돌려준다.
// 「이미 추첨한 경품」은 회차가 하나라도 있는 경품이다. 확정 전 임시 회차도 포함한다 (spec A-12).
export async function loadPrizes(): Promise<{ prizes: PrizeRecord[]; drawnIds: number[] }> {
  const supabase = getSupabase();
  const [prizeResult, drawResult] = await Promise.all([
    supabase.from("prizes").select("id, name, winner_count, sort").order("sort").order("id"),
    supabase.from("draws").select("prize_id"),
  ]);
  if (prizeResult.error) throw new DbError(prizeResult.error.message);
  if (drawResult.error) throw new DbError(drawResult.error.message);

  const prizes = prizeResult.data.map((p) => ({
    id: p.id,
    name: p.name,
    winnerCount: p.winner_count,
    sort: p.sort,
  }));
  const drawnIds = [...new Set(drawResult.data.map((d) => d.prize_id as number))];
  return { prizes, drawnIds };
}

export function toPrizeResponse(prizes: PrizeRecord[], drawnIds: number[]): PrizeResponse[] {
  const drawn = new Set(drawnIds);
  return prizes.map((p) => ({ ...p, drawn: drawn.has(p.id) }));
}

// ── 참가자 현황 전체 ─────────────────────────────────  콘솔 목록과 CSV 가 함께 쓴다
export type ZoneColumn = { code: string; name: string };

export type ParticipantWin = { drawId: number; prizeName: string };

export type ParticipantRow = {
  participantNo: number;
  visits: Record<string, string | null>; // 키는 구역 code
  visitedAt: (string | null)[]; // zones 순서와 같다. CSV 열이 밀리지 않게
  completed: boolean;
  wins: ParticipantWin[]; // 확정 당첨만, 경품 순서대로
};

type ConfirmedWinRow = {
  draw_id: number;
  participant_no: number;
  draw: { prize: { name: string; sort: number } };
};

// 확정 당첨만 넣는다. 임시 결과는 아직 당첨이 아니고, 부재자는 당첨자로 세지 않는다 (spec 4장).
export async function loadParticipantRows(): Promise<{ zones: ZoneColumn[]; rows: ParticipantRow[] }> {
  const supabase = getSupabase();
  const [zones, participants, visits, wins] = await Promise.all([
    loadZones(),
    selectAll<{ participant_no: number }>((from, to) =>
      supabase.from("participants").select("participant_no").order("participant_no").range(from, to),
    ),
    selectAll<{ participant_no: number; zone_id: number; visited_at: string }>((from, to) =>
      supabase
        .from("visits")
        .select("participant_no, zone_id, visited_at")
        .order("participant_no")
        .order("zone_id")
        .range(from, to),
    ),
    selectAll<ConfirmedWinRow>(
      (from, to) =>
        supabase
          .from("draw_winners")
          .select("draw_id, participant_no, draw:draws(prize:prizes(name, sort))")
          .eq("status", "confirmed")
          .order("draw_id")
          .order("participant_no")
          .range(from, to) as unknown as PageResult<ConfirmedWinRow>,
    ),
  ]);

  const visitsByNo = new Map<number, Map<number, string>>();
  for (const v of visits) {
    if (!visitsByNo.has(v.participant_no)) visitsByNo.set(v.participant_no, new Map());
    visitsByNo.get(v.participant_no)!.set(v.zone_id, v.visited_at);
  }

  const winsByNo = new Map<number, (ParticipantWin & { sort: number })[]>();
  for (const w of wins) {
    const list = winsByNo.get(w.participant_no) ?? [];
    list.push({ drawId: w.draw_id, prizeName: w.draw.prize.name, sort: w.draw.prize.sort });
    winsByNo.set(w.participant_no, list);
  }

  const rows = participants.map(({ participant_no: no }) => {
    const visited = visitsByNo.get(no) ?? new Map<number, string>();
    const visitedAt = zones.map((z) => visited.get(z.id) ?? null);
    return {
      participantNo: no,
      visits: Object.fromEntries(zones.map((z, i) => [z.code, visitedAt[i]])),
      visitedAt,
      completed: isCompleted(visited.size, zones.length),
      wins: (winsByNo.get(no) ?? [])
        .sort((a, b) => a.sort - b.sort || a.drawId - b.drawId)
        .map(({ drawId, prizeName }) => ({ drawId, prizeName })),
    };
  });

  return { zones: zones.map((z) => ({ code: z.code, name: z.name })), rows };
}

// ── 통계 ─────────────────────────────────────────────  콘솔 맨 위 숫자
export type Stats = { total: number; completed: number; inProgress: number };

export function buildStats(rows: ParticipantRow[]): Stats {
  const completed = rows.filter((r) => r.completed).length;
  return { total: rows.length, completed, inProgress: rows.length - completed };
}
