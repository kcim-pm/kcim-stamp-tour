import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import { loadDraw, toDrawResponse, toDrawRow } from "@/lib/admin-query";
import { assertPending } from "@/lib/draw-state";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// POST /api/admin/draws/{회차번호}/confirm — 당첨 확정 (spec 5.3, A-25)
// 확정해야 [다음 경품 →]이 가능해진다.
//
// 저장 순서: ① 임시 당첨자 → 확정 ② 회차 → 확정 (임시 상태일 때만)
//   ①과 ② 사이에서 오류가 나도 [당첨 확정]을 한 번 더 누르면 끝난다(①은 바꿀 것이 없고 ②가 마저 확정).
//   반대 순서면 「확정된 회차에 임시 당첨자가 남은」 상태가 생기고, 다시 확정할 수 없어 DB 를 손으로 고쳐야 한다.
//   두 창에서 동시에 눌러도 ①은 결과가 같고, ②의 조건 덕분에 한쪽만 성공한다.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const drawId = Number((await params).id);
  if (!Number.isInteger(drawId) || drawId < 1) return apiError("INVALID_BODY");

  const supabase = getSupabase();
  try {
    const draw = await loadDraw(drawId);
    if (!draw) return apiError("DRAW_NOT_FOUND");
    assertPending(toDrawRow(draw));

    // lib/draw-state.ts confirmedWinners 와 같은 규칙: pending → confirmed, absent 는 그대로. 한 번의 저장으로 처리한다.
    const { error: winnersError } = await supabase
      .from("draw_winners")
      .update({ status: "confirmed" })
      .eq("draw_id", drawId)
      .eq("status", "pending");
    if (winnersError) throw new DbError(winnersError.message);

    const { data: updated, error: drawError } = await supabase
      .from("draws")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", drawId)
      .eq("status", "pending")
      .select("id");
    if (drawError) throw new DbError(drawError.message);
    // 다른 창에서 먼저 확정했다
    if (updated.length === 0) return apiError("DRAW_NOT_PENDING");

    const saved = await loadDraw(drawId);
    if (!saved) throw new DbError(`회차 ${drawId} 를 다시 읽지 못했다`);
    return NextResponse.json(toDrawResponse(saved));
  } catch (e) {
    return toErrorResponse(e, "[POST /api/admin/draws/confirm]");
  }
}
