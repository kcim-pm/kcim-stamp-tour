// 경품 소개와 경품 타이틀. spec 3.4 「경품 소개」, A-12
// 준비 단계에는 이름을 크게, 그 아래 「N명 추첨」을 둔다 (PrizeIntro).
// 추첨 중·결과 단계에는 같은 내용을 작게 줄여 무대 위쪽 가운데에 고정한다 (PrizeTitle). 번호가 몇 개든 타이틀은 움직이지 않는다.
// 경품 사진은 보여 주지 않는다 (10/22 결정, D-21 폐기).

type Prize = { name: string };

export function PrizeIntro({ prize, count }: { prize: Prize; count: number | string }) {
  return (
    <div className="prize-intro">
      <div className="prize-intro__text">
        <h1 className="prize-intro__name">{prize.name}</h1>
        <div className="prize-intro__count">
          <span>{count}</span>명 추첨
        </div>
      </div>
    </div>
  );
}

export function PrizeTitle({ prize, count }: { prize: Prize; count: number | string }) {
  return (
    <div className="prize-title">
      <h1 className="prize-title__name">{prize.name}</h1>
      <div className="prize-title__count">{count}명 추첨</div>
    </div>
  );
}
