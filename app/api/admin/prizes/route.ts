import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/admin-session";
import { apiError, toErrorResponse } from "@/lib/api-error";
import { loadPrizes, toPrizeResponse } from "@/lib/admin-query";
import { splitPrizeChanges } from "@/lib/draw-state";
import { getSupabase } from "@/lib/supabase-server";
import { DbError } from "@/lib/status-query";

// GET·PUT /api/admin/prizes — 경품 목록 조회와 저장 (spec 5.3, A-12, D-19)

// 경품을 추첨 순서대로, 이미 추첨했는지(drawn)를 붙여 돌려준다. 콘솔은 drawn 인 줄의 입력란을 막는다.
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const { prizes, drawnIds } = await loadPrizes();
    return NextResponse.json({ prizes: toPrizeResponse(prizes, drawnIds) });
  } catch (e) {
    return toErrorResponse(e, "[GET /api/admin/prizes]");
  }
}

// 화면의 경품 목록 전체를 받아 DB 를 그 목록과 같게 만든다.
// Supabase 로는 여러 저장을 하나로 묶을 수 없어, 저장 도중 DB 오류가 나면 일부만 저장된다.
// 행사 전에 몇 번 저장하는 정도라 오류가 보이면 다시 저장하면 된다. 규칙 검사는 저장 전에 끝난다.
export async function PUT(request: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: { prizes?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_BODY");
  }
  if (!Array.isArray(body?.prizes)) return apiError("INVALID_BODY");

  try {
    const { prizes: current, drawnIds } = await loadPrizes();
    // 규칙에 어긋나면 여기서 던지고 DB 는 하나도 바뀌지 않는다.
    const { toInsert, toUpdate, toDelete } = splitPrizeChanges(current, body.prizes, drawnIds);

    const supabase = getSupabase();
    // 순서: 삭제 → 수정 → 추가
    if (toDelete.length > 0) {
      const { error } = await supabase.from("prizes").delete().in("id", toDelete);
      if (error) throw new DbError(error.message);
    }
    for (const p of toUpdate) {
      const { error } = await supabase
        .from("prizes")
        .update({ name: p.name, winner_count: p.winnerCount, sort: p.sort, image_url: p.imageUrl })
        .eq("id", p.id);
      if (error) throw new DbError(error.message);
    }
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("prizes")
        .insert(toInsert.map((p) => ({ name: p.name, winner_count: p.winnerCount, sort: p.sort, image_url: p.imageUrl })));
      if (error) throw new DbError(error.message);
    }

    const saved = await loadPrizes();
    return NextResponse.json({ prizes: toPrizeResponse(saved.prizes, saved.drawnIds) });
  } catch (e) {
    return toErrorResponse(e, "[PUT /api/admin/prizes]");
  }
}
