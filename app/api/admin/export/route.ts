import { requireAdminApi } from "@/lib/admin-session";
import { toErrorResponse } from "@/lib/api-error";
import { loadParticipantRows } from "@/lib/admin-query";
import { buildCsv, formatTime } from "@/lib/csv";

// GET /api/admin/export — 참가자 현황 CSV 내려받기 (spec 5.3 export, A-23, D-17)
// 콘솔의 [CSV 내려받기] 링크가 부른다. 링크라서 로그인이 풀렸으면 브라우저에 오류 JSON 이 그대로 보인다.
// 콘솔에서만 누르는 링크라 그대로 둔다.
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { zones, rows } = await loadParticipantRows();
    // visitedAt 은 loadParticipantRows 가 구역 sort 순서대로 채운다. 순서가 틀리면 열이 밀린다.
    const csv = buildCsv(
      zones,
      rows.map((r) => ({
        participantNo: r.participantNo,
        visitedAt: r.visitedAt,
        completed: r.completed,
        prizes: r.wins.map((w) => w.prizeName),
      })),
    );

    // 파일 이름은 영문·숫자만. 한글 파일 이름은 브라우저마다 다르게 깨질 수 있다.
    // formatTime 결과 "2026-10-27 17:05:00" → "2026-10-27-170500"
    const stamp = formatTime(new Date().toISOString()).replace(" ", "-").replace(/:/g, "");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="stamp-tour-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return toErrorResponse(e, "[GET /api/admin/export]");
  }
}
