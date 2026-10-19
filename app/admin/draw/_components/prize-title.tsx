"use client";

// 경품 소개와 경품 타이틀 (클라이언트). spec 3.4 「경품 소개」, A-12, D-21
// 준비 단계에는 사진을 크게, 이름과 「N명 추첨」을 옆에 둔다 (PrizeIntro).
// 추첨 중·결과 단계에는 같은 내용을 작게 줄여 무대 위쪽 가운데에 고정한다 (PrizeTitle). 번호가 몇 개든 타이틀은 움직이지 않는다.
// 사진은 콘솔 경품 목록에 적은 주소다. 없거나 못 불러오면 자리 표시만 보인다.
import { useState } from "react";

type Prize = { name: string; imageUrl: string | null };

function PhotoIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="2" />
      <path d="M21 15l-5-5-8 8" />
    </svg>
  );
}

function PrizePhoto({ prize, large }: { prize: Prize; large: boolean }) {
  const [failed, setFailed] = useState(false);
  const show = prize.imageUrl && !failed;
  return (
    <div className={`prize-photo${large ? " prize-photo--large" : ""}`}>
      {show ? (
        // 외부 주소의 사진이라 next/image 대신 일반 img 를 쓴다. 발표 화면 한 곳에서만 쓰는 사진이다.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prize.imageUrl!} alt="" onError={() => setFailed(true)} />
      ) : (
        <>
          <PhotoIcon size={large ? 88 : 34} />
          {large && <span>경품 사진</span>}
        </>
      )}
    </div>
  );
}

export function PrizeIntro({ prize, count }: { prize: Prize; count: number | string }) {
  return (
    <div className="prize-intro">
      <PrizePhoto prize={prize} large />
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
      <PrizePhoto prize={prize} large={false} />
      <h1 className="prize-title__name">{prize.name}</h1>
      <div className="prize-title__count">{count}명 추첨</div>
    </div>
  );
}
