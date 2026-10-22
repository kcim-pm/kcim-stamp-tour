"use client";
// 참가자 화면 본체 (spec 3.2). 디자인은 app/globals.css 의 클래스, 로직은 이 파일.
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { isZoneVisited, type ParticipantStatus, type ZoneStatus } from "@/lib/status";
import { StickyHeader } from "@/components/sticky-header";

// 트로피 애니메이션 플레이어는 완주 카드가 뜰 때만 불러온다. 불러오는 동안은 같은 크기의 빈 칸을 둔다.
const TrophyLottie = dynamic(() => import("./trophy-lottie"), { ssr: false });

export type ZoneResult =
  | { kind: "none" }
  | { kind: "valid"; code: string; name: string }
  | { kind: "invalid" };

type Banner =
  | { kind: "success"; zoneName: string }
  | { kind: "already"; zoneName: string }
  | { kind: "invalid-no" }
  | { kind: "invalid-token" }
  | { kind: "network" };

const STORAGE_KEY = "participantNo";

// 경로형 스탬프 배치. 구역 5곳 기준 좌표(px)와 기울기. 구역 수가 다르면 한 줄 배치로 대체한다.
// 코인 자리는 SVG viewBox(318x214)와 같은 좌표계의 px 값이다. 화면에는 백분율로 바꿔 놓아 트랙이 줄어도 경로 위에 머문다.
const TRACK_W = 318;
const TRACK_H = 214;
const COIN_SLOTS = [
  { left: 2, top: 10, r: -10 },
  { left: 124, top: 92, r: 8 },
  { left: 248, top: 10, r: -5 },
  { left: 212, top: 122, r: 6 },
  { left: 28, top: 142, r: -7 },
];
const TRACK_PATH =
  "M36 44 C 90 44, 110 126, 158 126 S 230 44, 282 44 C 298 44, 298 118, 246 156 S 120 196, 62 176";
// 찍힌 구간까지의 경로. 마지막으로 찍힌 구역 순서에 따라 잘라 쓴다.
const TRAIL_BY_COUNT = [
  "",
  "M36 44 C 90 44, 110 126, 158 126",
  "M36 44 C 90 44, 110 126, 158 126 S 230 44, 282 44",
  "M36 44 C 90 44, 110 126, 158 126 S 230 44, 282 44",
  "M36 44 C 90 44, 110 126, 158 126 S 230 44, 282 44 C 298 44, 298 118, 246 156",
  TRACK_PATH,
];

export function ParticipantScreen({ zone, zoneToken }: { zone: ZoneResult; zoneToken: string | null }) {
  const [input, setInput] = useState("");
  const [savedNo, setSavedNo] = useState<number | null>(null);
  const [status, setStatus] = useState<ParticipantStatus | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);
  // 처음 열 때: 저장된 번호가 있으면 입력란에 채우고 현황을 조용히 불러온다 (P-04, P-09)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    setInput(saved);
    setSavedNo(Number(saved));
    fetchStatus(saved).then((s) => s && setStatus(s)).catch(() => {});
  }, []);

  async function fetchStatus(no: string): Promise<ParticipantStatus | null> {
    const res = await fetch(`/api/status?no=${encodeURIComponent(no)}`);
    if (!res.ok) return null;
    return res.json();
  }

  function remember(s: ParticipantStatus) {
    localStorage.setItem(STORAGE_KEY, String(s.participantNo));
    setSavedNo(s.participantNo);
    setStatus(s);
  }

  // [방문 인증하기 →]
  async function verify() {
    setBusy(true);
    try {
      const res = await fetch("/api/visit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantNo: input, zoneToken }),
      });
      if (res.status === 400) return setBanner({ kind: "invalid-no" });
      if (res.status === 404) return setBanner({ kind: "invalid-token" });
      if (!res.ok) return setBanner({ kind: "network" });

      const data = await res.json();
      remember(data.status);
      setBanner({ kind: data.alreadyVisited ? "already" : "success", zoneName: data.zone.name });
    } catch {
      setBanner({ kind: "network" });
    } finally {
      setBusy(false);
    }
  }

  // [현황 확인하기 →]
  async function lookup() {
    setBusy(true);
    try {
      const res = await fetch(`/api/status?no=${encodeURIComponent(input)}`);
      if (res.status === 400) return setBanner({ kind: "invalid-no" });
      if (!res.ok) return setBanner({ kind: "network" });
      remember(await res.json());
      setBanner(null);
    } catch {
      setBanner({ kind: "network" });
    } finally {
      setBusy(false);
    }
  }

  const canVerify = zone.kind === "valid";
  // 이 구역 인증을 마쳤으면 입력을 막고 메인으로 돌아가게 한다. 다시 열어도 저장된 번호의 현황으로 판단한다
  const verified = zone.kind === "valid" && isZoneVisited(status, zone.code);
  const retry = banner?.kind === "network" ? (canVerify ? verify : lookup) : null;

  return (
    <main className="screen">
      {/* 1 머리글 */}
      <StickyHeader className="header header-bar">
        <a href="/" className="header-title">
          BIMlize Con 2026 <em>스탬프 투어</em>
        </a>
        <a href="/manual" className="header-link">
          <InfoIcon />
          이용 안내
        </a>
      </StickyHeader>

      {/* 2 현재 위치 */}
      <section className="card card-center">
        {zone.kind === "valid" && (
          <>
            <span className="badge">
              <PinIcon />
              현재 위치
            </span>
            <div className="zone-name">{zone.name}</div>
            <div className="hint">번호를 입력하고 인증을 누르세요</div>
          </>
        )}
        {zone.kind === "none" && (
          <>
            <span className="badge">
              <PinIcon />
              나의 투어 현황
            </span>
            <div className="hint">번호를 입력하면 지금까지의 인증 현황을 볼 수 있습니다</div>
          </>
        )}
        {zone.kind === "invalid" && (
          <>
            <div className="zone-name">잘못된 QR입니다</div>
            <div className="hint">구역에 붙은 QR을 다시 스캔해 주세요</div>
          </>
        )}
      </section>

      {/* 3 번호 입력 */}
      <section className="card">
        <label className="label" htmlFor="participant-no">
          참가번호 입력
        </label>
        <input
          id="participant-no"
          className="input-no"
          inputMode="numeric"
          maxLength={3}
          placeholder="801"
          value={input}
          disabled={verified}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="hint-small">입장 명찰이나 등록 번호를 입력해 주세요</div>
        {verified ? (
          <a className="btn btn-back" href="/">
            <BackIcon />
            메인으로 돌아가기
          </a>
        ) : (
          <button className="btn" disabled={busy} onClick={canVerify ? verify : lookup}>
            {canVerify ? "방문 인증하기 →" : "현황 확인하기 →"}
          </button>
        )}
      </section>

      {/* 4 결과 배너 */}
      {banner?.kind === "success" && (
        <div className="banner banner-success">
          <CheckCircleIcon />
          {banner.zoneName} 인증 완료!
        </div>
      )}
      {banner?.kind === "already" && <div className="banner banner-gray">이미 인증한 구역입니다</div>}
      {banner?.kind === "invalid-no" && <div className="banner banner-error">1부터 999 사이의 번호를 입력하세요</div>}
      {banner?.kind === "invalid-token" && (
        <div className="banner banner-error">잘못된 QR입니다. 구역에 붙은 QR을 다시 스캔해 주세요</div>
      )}
      {banner?.kind === "network" && (
        <div className="banner banner-error">
          <span>연결에 실패했습니다</span>
          {retry && (
            <button className="btn-small" onClick={retry}>
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* 5 완주 */}
      {status?.completed && (
        <section className="clay">
          <Confetti />
          <div className="trophy-lottie" aria-hidden="true">
            <TrophyLottie />
          </div>
          <div className="win-title">완주 성공!</div>
          <div className="win-label">내 참가번호</div>
          <div className="win-no">{status.participantNo}</div>
          <div className="win-body">{status.zoneCount}곳 인증 완료. 추첨에 무사히 응모되셨습니다!</div>
          <div className="win-foot">추첨 및 당첨자 발표는 행사 종료 후 진행될 예정입니다.</div>
        </section>
      )}

      {/* 6 인증 현황 */}
      {savedNo !== null && status && (
        <section className="card" style={{ gap: 12 }}>
          <div className="status-head">
            <div className="status-title">
              인증 현황 <span>#{savedNo}</span>
            </div>
            <div className="status-count">
              {status.visitedCount}
              <span> / {status.zoneCount}</span>
            </div>
          </div>
          <StampTrack zones={status.zones} />
          {!status.completed && (
            <div className="hint" style={{ textAlign: "center" }}>
              {status.zoneCount}곳을 모두 방문 후 인증하면 추첨에 자동 응모됩니다
            </div>
          )}
          {status.completed && (
            <span className="badge badge-solid">
              <CheckIcon />
              추첨 응모 완료
            </span>
          )}
        </section>
      )}
    </main>
  );
}

// 경로형 스탬프. 구역이 5곳이면 S자 경로 위에, 아니면 한 줄로 놓는다.
function StampTrack({ zones }: { zones: ZoneStatus[] }) {
  const onPath = zones.length === COIN_SLOTS.length;
  const visitedCount = zones.filter((z) => z.visited).length;
  // 찍힌 구간: 앞에서부터 연속으로 찍힌 개수까지만 진하게 칠한다
  let streak = 0;
  for (const z of zones) {
    if (!z.visited) break;
    streak += 1;
  }

  const coins = zones.map((z, i) => {
    const slot = onPath ? COIN_SLOTS[i] : { left: 0, top: 0, r: [-10, 8, -5, 6, -7][i % 5] };
    const style = {
      "--r": `${slot.r}deg`,
      ...(onPath ? { left: `${(slot.left / TRACK_W) * 100}%`, top: `${(slot.top / TRACK_H) * 100}%` } : {}),
      animationDelay: z.visited ? `${0.5 + i * 0.2}s` : `${(i * 0.4) % 1.5}s`,
    } as React.CSSProperties;
    const cls = z.visited ? `coin coin-done c${(i % 5) + 1}` : "coin coin-wait";
    return (
      <div key={z.code} className={cls} style={style} title={z.visited ? "인증 완료" : "대기"}>
        {z.name}
      </div>
    );
  });

  if (!onPath) return <div className="coin-row">{coins}</div>;

  return (
    <div className="track" aria-label={`${visitedCount}곳 인증 완료`}>
      <svg viewBox={`0 0 ${TRACK_W} ${TRACK_H}`} fill="none" aria-hidden="true">
        <path d={TRACK_PATH} stroke="#d4ecf5" strokeWidth="14" strokeLinecap="round" />
        <path d={TRACK_PATH} stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
        {streak > 0 && (
          <path className="trail" d={TRAIL_BY_COUNT[streak]} stroke="#00A8C0" strokeWidth="4" strokeLinecap="round" />
        )}
      </svg>
      {coins}
    </div>
  );
}

function Confetti() {
  const pieces = [
    { left: "10%", bottom: "10%", bg: "#ff4d86", delay: "0s" },
    { left: "26%", bottom: "6%", bg: "#00A8C0", delay: "0.5s" },
    { left: "50%", bottom: "8%", bg: "#3fb9ff", delay: "1s" },
    { left: "72%", bottom: "4%", bg: "#ffab2e", delay: "0.3s" },
    { left: "88%", bottom: "12%", bg: "#4dd98a", delay: "1.4s" },
  ];
  return (
    <>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti"
          aria-hidden="true"
          style={{ left: p.left, bottom: p.bottom, background: p.bg, animationDelay: p.delay }}
        />
      ))}
    </>
  );
}

/* 머리글 [이용 안내] 앞의 정보 아이콘 */
function InfoIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f9d5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
