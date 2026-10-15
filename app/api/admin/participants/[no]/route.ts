import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import { normalizeParticipantNo } from "@/lib/participant-no";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// DELETE /api/admin/participants/{참가번호} — 참가자 삭제 (spec 5.3, A-08)
// 방문 기록과 당첨 기록은 DB 가 함께 지운다 (on delete cascade, spec 4장).
// 없는 번호를 지워도 204 다. 두 운영자가 같은 번호를 동시에 지워도 결과는 「지워진 상태」로 같다.
// 확정 당첨자를 지우면 그 회차의 당첨자도 한 명 줄어든다. 콘솔의 확인 창에서 미리 알린다.
export async function DELETE(_request: Request, { params }: { params: Promise<{ no: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let participantNo: number;
  try {
    participantNo = normalizeParticipantNo((await params).no);
  } catch {
    return apiError("INVALID_PARTICIPANT_NO");
  }

  try {
    const { error } = await getSupabase().from("participants").delete().eq("participant_no", participantNo);
    if (error) throw new DbError(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e, "[DELETE /api/admin/participants]");
  }
}
