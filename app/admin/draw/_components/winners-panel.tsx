"use client";

// 오른쪽 「당첨 현황」 패널 (클라이언트). spec 3.4 우측 패널, A-26
// 경품 이름만 추첨 순서대로 늘어놓는다. 확정된 경품에는 당첨 번호 칩이 붙고, 지금 뽑는 경품은 연보라 띠로 표시한다.
// 「지금 추첨」「확정 전」 같은 상태 글자와 인원 수는 적지 않는다. 임시 결과는 발표가 끝난 것이 아니므로 올리지 않는다.
// 전체 진행률은 표시하지 않는다 (10/15 결정). 번호가 많아 넘치면 패널 안에서만 스크롤한다.
import type { DrawResponse, PrizeResponse } from "@/lib/admin-query";

type Props = { prizes: PrizeResponse[]; draws: DrawResponse[]; currentPrizeId: number | null };

export function WinnersPanel({ prizes, draws, currentPrizeId }: Props) {
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
        const state = nos ? "is-done" : p.id === currentPrizeId ? "is-current" : "is-waiting";
        return (
          <section key={p.id} className={`panel-prize ${state}`}>
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
