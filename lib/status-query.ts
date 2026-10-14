import "server-only";
import { getSupabase } from "./supabase-server";
import { buildStatus, type ParticipantStatus, type VisitRow, type ZoneRow } from "./status";

// 현황 조회 (DB 접근)
// DB 오류를 한 종류로 묶는다. Route Handler 는 이 오류를 500 DB_ERROR 로 옮긴다.
export class DbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DbError";
  }
}

// zones 를 sort 순서로 전부 읽는다.
export async function loadZones(): Promise<ZoneRow[]> {
  const { data, error } = await getSupabase()
    .from("zones")
    .select("id, code, name, sort")
    .order("sort");
  if (error) throw new DbError(error.message);
  return data;
}

// 참가번호의 현황을 만든다. participants 에 행을 만들지 않는다.
export async function loadStatus(participantNo: number): Promise<ParticipantStatus> {
  const zones = await loadZones();

  const { data: visits, error } = await getSupabase()
    .from("visits")
    .select("zone_id, visited_at")
    .eq("participant_no", participantNo);
  if (error) throw new DbError(error.message);

  return buildStatus(participantNo, zones, visits as VisitRow[]);
}
