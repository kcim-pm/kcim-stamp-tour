"use client";

// 추첨·발표 화면 본체 (클라이언트). spec 3.4, A-09~A-18, A-24~A-26, D-10, D-18, D-19
// 경품 목록 순서대로 한 경품씩: 준비 → 추첨 중 → 결과(임시) → (부재자 재추첨) → 확정 → [다음 경품 →]
//
// 가장 중요한 원칙: 「지금 어느 단계인가」를 따로 저장하지 않고 서버에서 받은 회차 목록을 보고 매번 계산한다.
// 그래야 창을 닫았다 다시 열거나 새로고침해도 같은 단계로 돌아온다 (spec 3.4, D-10).
// 화면에만 기억하는 것은 「방금 확정한 회차」, 보고 있는 이전 회차, 고른 번호, 준비 입력값, 연출 상태뿐이다.
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch, errorMessage } from "@/lib/admin-fetch";
import type { DrawResponse, PrizeResponse } from "@/lib/admin-query";
import { currentPrize } from "@/lib/draw-state";
import { WinnerGrid } from "./winner-grid";
import { WinnersPanel } from "./winners-panel";

type DrawsResponse = { draws: DrawResponse[]; candidateCount: number; completedCount: number };
type Phase = "drawing" | "result" | "confirmed" | "done" | "ready";

// 연출 시간. 결과는 서버가 이미 정했고 연출은 그것을 보여 줄 뿐이다 (A-14, 방식은 미정이라 최소 구현).
const SHUFFLE_MS = 3000;
const HIGHLIGHT_MS = 2500;

export function DrawScreen() {
  const [prizes, setPrizes] = useState<PrizeResponse[] | null>(null);
  const [drawData, setDrawData] = useState<DrawsResponse | null>(null);

  // 확정하는 순간 지금 차례가 다음 경품으로 넘어간다. 기억하지 않으면 관객이 확정 번호를 볼 시간 없이 다음 준비 화면이 뜬다.
  const [justConfirmedId, setJustConfirmedId] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());
  const [excludePrevious, setExcludePrevious] = useState(true);
  const [countInput, setCountInput] = useState("");
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shuffleNo, setShuffleNo] = useState(0);
  // 요청 중에는 모든 조작 버튼을 막는다. 두 번 눌러 회차가 두 개 생기는 것을 막기 위해서다.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingMs = useRef(SHUFFLE_MS);
  const sound = useSound();

  // 처음 열 때, 그리고 조작이 실패했을 때 두 API 를 함께 다시 부른다.
  const reload = useCallback(async () => {
    const [p, d] = await Promise.all([
      adminFetch<{ prizes: PrizeResponse[] }>("/api/admin/prizes"),
      adminFetch<DrawsResponse>("/api/admin/draws"),
    ]);
    if (p.ok) setPrizes(p.data.prizes);
    if (d.ok) setDrawData(d.data);
    if (!p.ok || !d.ok) setError(errorMessage(!p.ok ? p.code : (d as { code: string }).code));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // ── 단계 계산 ──────────────────────────────────────
  const draws = drawData?.draws ?? [];
  const pendingDraw = draws.find((d) => d.status === "pending") ?? null;
  const justConfirmed = draws.find((d) => d.id === justConfirmedId) ?? null;
  const current = prizes
    ? currentPrize(prizes, draws.map((d) => ({ id: d.id, prize_id: d.prize.id, status: d.status })))
    : null;
  const viewing = draws.find((d) => d.id === viewingId) ?? null;
  const confirmedDraws = draws.filter((d) => d.status === "confirmed");

  // 마지막 경품을 확정하면(current 가 없음) 확정 격자를 건너뛰고 바로 종료 화면으로 간다.
  // 마지막 당첨 번호는 오른쪽 「당첨 현황」과 [이전 결과]에서 볼 수 있다.
  let phase: Phase;
  if (pendingDraw && animating) phase = "drawing";
  else if (pendingDraw) phase = "result";
  else if (justConfirmed && current) phase = "confirmed";
  else if (!current) phase = "done";
  else phase = "ready";

  // 다음 경품으로 넘어가면 당첨 인원 입력란을 그 경품의 인원으로 채운다.
  const currentId = current?.id ?? null;
  const currentCount = current?.winnerCount ?? null;
  useEffect(() => {
    if (currentCount !== null) setCountInput(String(currentCount));
  }, [currentId, currentCount]);

  // ── 연출 ───────────────────────────────────────────
  // [일시정지]는 타이머를 멈추고, 다시 누르면 남은 시간부터 이어 간다.
  // 연출 중인지는 화면에만 기억하므로 도중에 새로고침하면 연출 없이 결과(임시) 단계가 나온다.
  useEffect(() => {
    if (!animating || paused) return;
    const startedAt = Date.now();
    const flicker = setInterval(() => {
      setShuffleNo(1 + Math.floor(Math.random() * 999));
      sound.tick();
    }, 80);
    const end = setTimeout(() => {
      setAnimating(false);
      sound.chime();
    }, remainingMs.current);
    return () => {
      clearInterval(flicker);
      clearTimeout(end);
      remainingMs.current = Math.max(0, remainingMs.current - (Date.now() - startedAt));
    };
  }, [animating, paused, sound]);

  // ── 조작 ───────────────────────────────────────────
  const replaceDraw = (draw: DrawResponse) =>
    setDrawData((d) => d && { ...d, draws: [...d.draws.filter((x) => x.id !== draw.id), draw].sort((a, b) => a.id - b.id) });

  async function run<T>(request: () => Promise<{ ok: true; data: T } | { ok: false; code: string }>, onSuccess: (data: T) => void) {
    setBusy(true);
    setError(null);
    const result = await request();
    if (result.ok) onSuccess(result.data);
    else {
      setError(errorMessage(result.code));
      await reload();
    }
    setBusy(false);
  }

  function startDraw() {
    if (!current) return;
    const count = Number(countInput);
    if (!/^\d+$/.test(countInput.trim()) || count < 1) {
      setError(errorMessage("INVALID_WINNER_COUNT"));
      return;
    }
    sound.unlock();
    run(
      () =>
        adminFetch<DrawResponse>("/api/admin/draws", {
          method: "POST",
          body: { prizeId: current.id, winnerCount: count, excludePrevious },
        }),
      (draw) => {
        replaceDraw(draw);
        setSelected(new Set());
        remainingMs.current = SHUFFLE_MS;
        setPaused(false);
        setAnimating(true);
      },
    );
  }

  function toggleSelect(no: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(no)) next.delete(no);
      else next.add(no);
      return next;
    });
  }

  function redraw() {
    if (!pendingDraw || selected.size === 0) return;
    const before = new Set(pendingDraw.winners.map((w) => w.participantNo));
    run(
      () =>
        adminFetch<DrawResponse>(`/api/admin/draws/${pendingDraw.id}/redraw`, {
          method: "POST",
          body: { participantNos: [...selected] },
        }),
      (draw) => {
        replaceDraw(draw);
        setSelected(new Set());
        // 새로 뽑힌 번호는 잠깐 강조한다.
        setHighlighted(new Set(draw.winners.map((w) => w.participantNo).filter((no) => !before.has(no))));
        setTimeout(() => setHighlighted(new Set()), HIGHLIGHT_MS);
      },
    );
  }

  function confirmDraw() {
    if (!pendingDraw) return;
    run(
      () => adminFetch<DrawResponse>(`/api/admin/draws/${pendingDraw.id}/confirm`, { method: "POST" }),
      (draw) => {
        replaceDraw(draw);
        setSelected(new Set());
        setJustConfirmedId(draw.id);
      },
    );
  }

  // ── 화면 ───────────────────────────────────────────
  if (!prizes || !drawData) {
    return (
      <main className="draw-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="draw-big">{error ?? "불러오는 중…"}</div>
      </main>
    );
  }

  const shownDraw = phase === "drawing" || phase === "result" ? pendingDraw : phase === "confirmed" ? justConfirmed : null;
  const shownPrize = shownDraw?.prize ?? (phase === "ready" ? current : null);
  const shownCount = shownDraw?.winnerCount ?? (phase === "ready" ? countInput : null);
  const candidateCount = excludePrevious ? drawData.candidateCount : drawData.completedCount;

  return (
    <main className="draw-screen">
      <div className="draw-main">
        <div className="draw-header">KCIM BIMlize Con 2026 · LUCKY DRAW</div>

        {/* 종료 화면에서는 경품 이름 줄을 감춰 가운데 종료 문구만 남긴다. */}
        {phase !== "done" && (
          <div className="draw-prize">
            <div>
              <div className="draw-prize-name">{shownPrize ? shownPrize.name : "경품 추첨"}</div>
            </div>
            {shownCount !== null && <div className="draw-prize-count">{shownCount}명 추첨</div>}
          </div>
        )}

        <div className="draw-stage">
          {phase === "ready" && (
            <div className="draw-setup">
              <div>
                추첨 후보 <span className="draw-big">{candidateCount}</span>명
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={excludePrevious}
                  disabled={busy}
                  onChange={(e) => setExcludePrevious(e.target.checked)}
                />
                <span className="switch-track" />
                이전 당첨자 제외
              </label>
              <label>
                당첨 인원{" "}
                <input
                  type="number"
                  min={1}
                  value={countInput}
                  disabled={busy}
                  onChange={(e) => setCountInput(e.target.value)}
                />{" "}
                명
              </label>
              <div className="draw-note">아래 [추첨 시작]을 누르세요</div>
            </div>
          )}

          {phase === "drawing" && (
            <>
              <div className="draw-shuffle" key={shuffleNo}>
                {shuffleNo || "?"}
              </div>
              {paused && <div className="draw-note">일시정지</div>}
            </>
          )}

          {phase === "result" && pendingDraw && (
            <>
              <WinnerGrid
                mode="select"
                draw={pendingDraw}
                selected={selected}
                highlighted={highlighted}
                disabled={busy}
                onToggle={toggleSelect}
              />
              <div className="draw-note">
                부재자가 있으면 해당 번호를 모두 선택한 뒤 [선택 번호 재추첨]을 눌러주세요
              </div>
              <div className="draw-actions">
                <button className="btn-ghost btn-primary" disabled={busy} onClick={confirmDraw}>
                  ✓ 당첨 확정
                </button>
                <button className="btn-ghost btn-danger" disabled={busy || selected.size === 0} onClick={redraw}>
                  선택 번호 재추첨{selected.size > 0 && ` (${selected.size})`}
                </button>
              </div>
            </>
          )}

          {phase === "confirmed" && justConfirmed && <WinnerGrid mode="confirmed" draw={justConfirmed} />}

          {phase === "done" &&
            (prizes.length === 0 ? (
              <div className="draw-big">등록된 경품이 없습니다</div>
            ) : (
              <FinishScreen />
            ))}
        </div>

        {error && <div className="draw-error">{error}</div>}

        {/* 버튼 위치는 단계와 상관없이 고정한다. 위치가 바뀌면 무대 옆의 운영자가 헷갈린다. */}
        <div className="draw-controls">
          <button className="btn-ghost" disabled={phase !== "drawing"} onClick={() => setPaused((p) => !p)}>
            {paused ? "계속" : "일시정지"}
          </button>
          <button className="btn-ghost btn-primary" disabled={phase !== "ready" || busy} onClick={startDraw}>
            추첨 시작
          </button>
          <button className="btn-ghost" disabled={confirmedDraws.length === 0 || busy} onClick={() => setHistoryOpen(true)}>
            이전 결과
          </button>
          <button
            className="btn-ghost"
            disabled={phase !== "confirmed" || !current || busy}
            onClick={() => setJustConfirmedId(null)}
          >
            다음 경품 →
          </button>
        </div>
      </div>

      <WinnersPanel prizes={prizes} draws={draws} />

      {historyOpen && (
        <div className="overlay" onClick={() => setHistoryOpen(false)}>
          <div className="overlay-box" onClick={(e) => e.stopPropagation()}>
            <div className="console-row" style={{ justifyContent: "space-between" }}>
              <div className="history-list">
                {confirmedDraws.map((d) => (
                  <button
                    key={d.id}
                    className={`btn-ghost${d.id === viewingId ? " btn-primary" : ""}`}
                    onClick={() => setViewingId(d.id)}
                  >
                    {d.prize.name}
                  </button>
                ))}
              </div>
              <button className="btn-ghost" onClick={() => setHistoryOpen(false)}>
                닫기
              </button>
            </div>
            {viewing ? (
              <>
                <div className="draw-prize-name">{viewing.prize.name}</div>
                <WinnerGrid mode="confirmed" draw={viewing} />
              </>
            ) : (
              <div className="draw-note">볼 경품을 고르세요</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

// 모든 경품을 확정한 뒤의 종료 화면. 참가자 화면 완주 카드와 같은 트로피·색종이를 프로젝터 크기로 키워 쓴다.
// 움직임은 globals.css 의 prefers-reduced-motion 규칙으로 함께 꺼진다.
const FINISH_CONFETTI = [
  { left: "8%", bottom: "12%", bg: "#ff4d86", delay: "0s" },
  { left: "20%", bottom: "4%", bg: "#6c4dff", delay: "0.6s" },
  { left: "34%", bottom: "10%", bg: "#3fb9ff", delay: "1.2s" },
  { left: "50%", bottom: "2%", bg: "#ffab2e", delay: "0.3s" },
  { left: "66%", bottom: "9%", bg: "#4dd98a", delay: "0.9s" },
  { left: "80%", bottom: "5%", bg: "#ff4d86", delay: "1.5s" },
  { left: "92%", bottom: "13%", bg: "#6c4dff", delay: "0.45s" },
];

function FinishScreen() {
  return (
    <div className="draw-finish">
      {FINISH_CONFETTI.map((p, i) => (
        <div
          key={i}
          className="confetti"
          aria-hidden="true"
          style={{ left: p.left, bottom: p.bottom, background: p.bg, animationDelay: p.delay }}
        />
      ))}
      <div className="trophy">
        <div className="ring" aria-hidden="true" />
        <div className="ring" aria-hidden="true" style={{ animationDelay: "0.9s" }} />
        <div className="trophy-inner">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="#7a4600" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8" />
            <path d="M12 17v4" />
            <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" />
            <path d="M17 6h2a2 2 0 0 1 0 4h-2" />
            <path d="M7 6H5a2 2 0 0 0 0 4h2" />
          </svg>
        </div>
      </div>
      <div className="draw-finish-label">LUCKY DRAW</div>
      <div className="draw-finish-title">모든 추첨이 끝났습니다</div>
      <div className="draw-finish-sub">참여해 주셔서 감사합니다</div>
    </div>
  );
}

// 효과음. 연출 방식이 정해지면 public/sounds/ 의 파일로 바꾼다. 지금은 브라우저에서 짧은 소리를 만든다.
// 브라우저는 사용자가 누르기 전에는 소리를 막으므로 [추첨 시작]을 누를 때 unlock 한다.
function useSound() {
  const ctx = useRef<AudioContext | null>(null);

  const beep = useCallback((freq: number, ms: number, gain: number, delayMs = 0) => {
    const ac = ctx.current;
    if (!ac) return;
    try {
      const at = ac.currentTime + delayMs / 1000;
      const osc = ac.createOscillator();
      const vol = ac.createGain();
      osc.frequency.value = freq;
      vol.gain.setValueAtTime(gain, at);
      vol.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      osc.connect(vol).connect(ac.destination);
      osc.start(at);
      osc.stop(at + ms / 1000);
    } catch {
      // 소리는 없어도 추첨은 진행된다.
    }
  }, []);

  const [api] = useState(() => ({
    unlock() {
      try {
        ctx.current ??= new AudioContext();
        void ctx.current.resume();
      } catch {
        ctx.current = null;
      }
    },
    tick: () => beep(1200, 25, 0.04),
    chime() {
      beep(880, 300, 0.15);
      beep(1320, 500, 0.15, 150);
    },
  }));
  return api;
}
