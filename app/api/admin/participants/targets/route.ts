import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import { loadCompletedNos } from "@/lib/admin-query";
import { normalizeParticipantNo } from "@/lib/participant-no";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// PUT /api/admin/participants/targets — 「추첨 대상」 체크 저장 (spec 5.3, A-27, D-24)
// 콘솔이 보낸 번호 전체를 「체크된 번호」로 만든다. 보낸 번호는 체크, 나머지는 해제.
// 체크를 누를 때마다 콘솔이 지금 화면의 체크 전체를 보내므로, 한 번의 요청으로 상태가 완전히 정해진다.
// 완주자만 체크할 수 있다(화면도 막지만 서버에서 다시 검사한다). 검사는 저장 전에 끝나서 틀리면 DB 는 바뀌지 않는다.
// 저장은 「해제 → 체크」 두 번이라 사이에 실패하면 일부만 바뀔 수 있다. 콘솔이 목록을 다시 읽고 [대상 저장]으로 다시 보내면 된다.
export async function PUT(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: { participantNos?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY");
  }
  if (!Array.isArray(body?.participantNos)) return apiError("INVALID_BODY");

  let nos: number[];
  try {
    nos = [...new Set(body.participantNos.map((v) => normalizeParticipantNo(String(v))))].sort((a, b) => a - b);
  } catch {
    return apiError("INVALID_PARTICIPANT_NO");
  }

  const supabase = getSupabase();
  try {
    const completed = new Set(await loadCompletedNos());
    if (nos.some((no) => !completed.has(no))) return apiError("NOT_COMPLETED");

    // 순서: ① 목록에 없는 번호를 해제 → ② 목록의 번호를 체크
    const clear = supabase.from("participants").update({ targeted: false }).eq("targeted", true);
    const { error: clearError } = await (nos.length > 0 ? clear.not("participant_no", "in", `(${nos.join(",")})`) : clear);
    if (clearError) throw new DbError(clearError.message);

    if (nos.length > 0) {
      const { error: setError } = await supabase
        .from("participants")
        .update({ targeted: true })
        .in("participant_no", nos);
      if (setError) throw new DbError(setError.message);
    }

    const { data, error } = await supabase
      .from("participants")
      .select("participant_no")
      .eq("targeted", true)
      .order("participant_no");
    if (error) throw new DbError(error.message);
    return NextResponse.json({ participantNos: data.map((r) => r.participant_no) });
  } catch (e) {
    return toErrorResponse(e, "[PUT /api/admin/participants/targets]");
  }
}
