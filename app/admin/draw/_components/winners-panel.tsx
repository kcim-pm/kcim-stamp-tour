"use client";

// 오른쪽 「당첨 현황」 패널 (클라이언트). spec 3.4 우측 패널, A-26
// 1등이 맨 위에 오도록 추첨 순서의 역순으로 늘어놓는다. 등수는 lib/draw-state.ts 의 winnersPanelRows 가 매긴다.
// 확정 전에는 「1등 (1명)」처럼 등수와 인원만 흐리게 적어, 관객이 어떤 경품이 나올지 미리 알지 못하게 한다.
// 확정되면 「3등 소형 안마기 (20명)」로 바꿔 진하게 적고 당첨 번호 칩을 붙인다. 임시 결과는 발표가 끝난 것이 아니므로 올리지 않는다.
// 지금 뽑는 경품은 연하늘색 띠로 표시한다. 「지금 추첨」「확정 전」 같은 상태 글자는 적지 않는다.
// 전체 진행률은 표시하지 않는다 (10/15 결정). 번호가 많아 넘치면 패널 안에서만 스크롤한다.
import type { DrawResponse, PrizeResponse } from "@/lib/admin-query";
import { winnersPanelRows } from "@/lib/draw-state";

type Props = { prizes: PrizeResponse[]; draws: DrawResponse[]; currentPrizeId: number | null };

export function WinnersPanel({ prizes, draws, currentPrizeId }: Props) {
  const confirmed = draws
    .filter((d) => d.status === "confirmed")
    .map((d) => ({
      prizeId: d.prize.id,
      participantNos: d.winners.filter((w) => w.status === "confirmed").map((w) => w.participantNo),
    }));

  return (
    <aside className="winners-panel">
      <h2>당첨 현황</h2>
      {prizes.length === 0 && <p className="hint">경품이 없습니다</p>}
      {winnersPanelRows(prizes, confirmed).map((row) => {
        const state = row.nos ? "is-done" : row.id === currentPrizeId ? "is-current" : "is-waiting";
        return (
          <section key={row.id} className={`panel-prize ${state}`}>
            <h3>
              {row.rank}등{row.name && ` ${row.name}`} ({row.count}명)
            </h3>
            {row.nos && (
              <div className="chips">
                {row.nos.map((no) => (
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
