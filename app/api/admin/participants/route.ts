import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { toErrorResponse } from "@/lib/api-error";
import { buildStats, loadParticipantRows } from "@/lib/admin-query";

// GET /api/admin/participants — 콘솔의 통계와 참가자 목록 (spec 5.3, A-04, A-05, A-27)
// 콘솔이 1분마다, 그리고 [새로고침]을 누를 때 부른다.
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { zones, rows } = await loadParticipantRows();
    return NextResponse.json({
      stats: buildStats(rows),
      zones,
      participants: rows.map(({ participantNo, visits, completed, targeted, wins }) => ({
        participantNo,
        visits,
        completed,
        targeted,
        wins,
      })),
    });
  } catch (e) {
    return toErrorResponse(e, "[GET /api/admin/participants]");
  }
}
