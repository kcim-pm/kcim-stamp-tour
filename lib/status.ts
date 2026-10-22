import { isCompleted } from "./completion";

// 현황 계산
export type ZoneRow = { id: number; code: string; name: string; sort: number };
export type VisitRow = { zone_id: number; visited_at: string };

export type ZoneStatus = {
  code: string;
  name: string;
  visited: boolean;
  visitedAt: string | null;
};

export type ParticipantStatus = {
  participantNo: number;
  zones: ZoneStatus[];
  visitedCount: number;
  zoneCount: number;
  completed: boolean;
};

export function buildStatus(
  participantNo: number,
  zones: ZoneRow[],
  visits: VisitRow[],
): ParticipantStatus {
  const visitedAtByZone = new Map(visits.map((v) => [v.zone_id, v.visited_at]));

  const zoneStatuses = zones.map((z) => {
    const visitedAt = visitedAtByZone.get(z.id) ?? null;
    return { code: z.code, name: z.name, visited: visitedAt !== null, visitedAt };
  });

  const visitedCount = zoneStatuses.filter((z) => z.visited).length;
  const zoneCount = zones.length;

  return {
    participantNo,
    zones: zoneStatuses,
    visitedCount,
    zoneCount,
    completed: isCompleted(visitedCount, zoneCount),
  };
}

// QR 화면에서 이 구역을 이미 인증했는지. 현황이 없으면 거짓이다 (spec 3.2 번호 입력 카드)
export function isZoneVisited(status: ParticipantStatus | null, zoneCode: string): boolean {
  return status?.zones.some((z) => z.code === zoneCode && z.visited) ?? false;
}
