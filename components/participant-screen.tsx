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

// 인증 현황 게이지 치수. 원은 SVG viewBox 기준 px, 칸 간격은 pathLength 100 기준이다.
const RING_SIZE = 132;
const RING_R = 54;
const RING_GAP = 2.5;

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
          <CourseGauge zones={status.zones} completed={status.completed} />
          {!status.completed && (
            <div className="hint" style={{ textAlign: "center", wordBreak: "keep-all" }}>
              순서에 상관없이 {status.zoneCount}곳을 인증하면 추첨에 자동 응모됩니다
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

// 인증 현황 게이지 + 구역 타일. 방문 순서를 제한하지 않으므로(P-05) 경로 대신 구역마다 칸 하나를 가진 원형 게이지로 보여 준다.
// 게이지 칸은 구역 수만큼 고르게 나누고 타일은 한 줄에 3개씩 흘려 놓아, 구역 수가 5곳이 아니어도 그대로 쓴다.
// 구역 색은 z1~z5 클래스(--zone)로 돌려 쓴다.
function CourseGauge({ zones, completed }: { zones: ZoneStatus[]; completed: boolean }) {
  const total = zones.length;
  const visitedCount = zones.filter((z) => z.visited).length;
  const segment = total > 0 ? 100 / total : 100;
  const center = RING_SIZE / 2;

  return (
    <div className="course">
      <div className={completed ? "gauge gauge-done" : "gauge"}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          role="img"
          aria-label={completed ? `${total}곳 모두 인증` : `${total}곳 중 ${visitedCount}곳 인증`}
        >
          {/* 12시 방향에서 시작해 시계 방향으로 구역 순서대로 칸을 놓는다 */}
          <g transform={`rotate(-90 ${center} ${center})`} fill="none" strokeWidth="12">
            {zones.map((z, i) => (
              <circle
                key={z.code}
                className={z.visited ? `gauge-seg z${(i % 5) + 1}` : "gauge-seg gauge-seg-wait"}
                cx={center}
                cy={center}
                r={RING_R}
                pathLength={100}
                strokeDasharray={`${segment - RING_GAP} ${100 - segment + RING_GAP}`}
                strokeDashoffset={-i * segment}
              />
            ))}
          </g>
        </svg>
        <div className="gauge-center" aria-hidden="true">
          {completed && <GaugeCheckIcon />}
          <div className="gauge-count">
            {visitedCount}
            <span> / {total}</span>
          </div>
          {!completed && <div className="gauge-label">구역 인증</div>}
        </div>
      </div>

      <div className="tiles">
        {zones.map((z, i) => (
          <div
            key={z.code}
            className={z.visited ? `tile tile-done z${(i % 5) + 1}` : `tile tile-wait z${(i % 5) + 1}`}
            style={z.visited ? { animationDelay: `${0.3 + i * 0.1}s` } : undefined}
            title={z.visited ? "인증 완료" : "대기"}
          >
            {z.visited ? <CheckIcon /> : <span className="tile-dot" />}
            {z.name}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 완주했을 때 게이지 가운데에 두는 큰 체크 */
function GaugeCheckIcon() {
  return (
    <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-10" />
    </svg>
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
