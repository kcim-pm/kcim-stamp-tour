"use client";

// 오른쪽 「당첨 현황」 패널 (클라이언트). spec 3.4 우측 패널, A-26
// 확정된 당첨 번호만 경품별로, 경품 순서대로 모아 보여 준다. 임시 결과는 발표가 끝난 것이 아니므로 올리지 않는다.
// 전체 진행률(확정 인원 / 전체 경품 인원)은 표시하지 않는다 (10/15 결정).
// 번호가 많아 넘치면 패널 안에서만 스크롤한다 (.winners-panel).
import type { DrawResponse, PrizeResponse } from "@/lib/admin-query";

export function WinnersPanel({ prizes, draws }: { prizes: PrizeResponse[]; draws: DrawResponse[] }) {
  const confirmedNosByPrize = new Map<number, number[]>();
  for (const d of draws) {
    if (d.status !== "confirmed") continue;
    const nos = d.winners.filter((w) => w.status === "confirmed").map((w) => w.participantNo);
    confirmedNosByPrize.set(d.prize.id, [...(confirmedNosByPrize.get(d.prize.id) ?? []), ...nos]);
  }

  return (
    <aside className="winners-panel">
      <h2>당첨 현황</h2>
      {prizes.length === 0 && <p className="hint">경품이 없습니다</p>}
      {prizes.map((p) => {
        const nos = confirmedNosByPrize.get(p.id);
        return (
          <section key={p.id} className={`panel-prize${nos ? "" : " is-waiting"}`}>
            <h3>{p.name}</h3>
            {nos && (
              <div className="chips">
                {[...nos]
                  .sort((a, b) => a - b)
                  .map((no) => (
                    <span key={no} className="chip">
                      {no}
                    </span>
                  ))}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}
