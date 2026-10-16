// scripts/capture-manual.mjs — 이용 매뉴얼(/manual) 화면 이미지 찍기
//
// 사용법 (저장소 루트에서, 다른 터미널에 npm run dev 를 켜 둔 상태로):
//   node --env-file=.env.local scripts/capture-manual.mjs
//
// 하는 일
//   1. 참가자 화면 4장을 휴대폰 크기로 찍는다. 900번대 테스트 참가자를 쓴다(scripts/test-data.mjs seed).
//      [방문 인증하기] 장면을 찍느라 900번대 참가자 1명에게 방문 기록 1건이 생긴다.
//   2. 브라우저 창이 뜨면 운영자가 직접 관리자 비밀번호로 로그인한다. 스크립트는 비밀번호를 다루지 않는다.
//   3. 관리자 화면 4장(로그인, 콘솔, 경품 목록, QR 인쇄)을 찍는다. QR 코드는 가린 채 찍는다(D-08).
//      경품 이름은 매뉴얼이 공개 페이지라 가린다. 관리자 API 응답의 경품 이름을 「1번 경품」처럼 바꿔 보여 줄 뿐 DB 는 그대로다.
//   4. 발표 화면에서 경품을 끝까지 실제로 추첨·확정하며 5장을 찍는다.
//      → DB 에 추첨 기록이 남고 경품이 잠긴다. 다 찍은 뒤 추첨 기록을 지울 것:
//        truncate table draw_winners, draws restart identity;
//      이미 추첨 기록이 있으면 4단계는 건너뛴다(준비 화면부터 찍을 수 없으므로).
//
// 이미지는 public/manual/ 에 저장한다. 화면이 바뀌면 이 스크립트를 다시 돌리면 된다.
//
// 브라우저 조작 라이브러리(playwright-core)는 이 저장소 의존성에 넣지 않았다.
// 워크스페이스의 kcim-work-space-client 에 설치된 것을 빌려 쓴다. 다른 위치면 PLAYWRIGHT_CORE 에 경로를 준다.
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE_URL = process.env.MANUAL_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("public/manual");
const PLAYWRIGHT_PATH =
  process.env.PLAYWRIGHT_CORE ?? path.resolve("../kcim-work-space-client/node_modules/playwright-core/index.mjs");
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

const { chromium } = await import(pathToFileURL(PLAYWRIGHT_PATH).href);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 없다. --env-file=.env.local 을 붙여 실행할 것");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function check(error, what) {
  if (error) {
    console.error(`${what} 실패: ${error.message}`);
    process.exit(1);
  }
}

const shot = (name) => path.join(OUT_DIR, `${name}.png`);

// ── 준비: 구역 토큰과 찍을 참가번호 고르기 (읽기만) ─────────────────
const { data: zones, error: zoneError } = await db.from("zones").select("id, qr_token, sort").order("sort");
check(zoneError, "구역 읽기");
const { data: people, error: peopleError } = await db
  .from("participants")
  .select("participant_no, visits(zone_id)")
  .gte("participant_no", 900)
  .lte("participant_no", 999)
  .order("participant_no");
check(peopleError, "900번대 참가자 읽기");

const visitedZones = (p) => new Set(p.visits.map((v) => v.zone_id));
const completed = people.find((p) => visitedZones(p).size === zones.length);
// 2곳 이상 돌았지만 완주 전이고, 인증 장면에 쓸 구역을 아직 안 간 사람
const partial = people.find((p) => {
  const seen = visitedZones(p);
  return seen.size >= 2 && seen.size < zones.length - 1;
});
if (!completed || !partial) {
  console.error("찍을 900번대 참가자가 없다. node --env-file=.env.local scripts/test-data.mjs seed 를 먼저 실행할 것");
  process.exit(1);
}
const scanZone = zones.find((z) => !visitedZones(partial).has(z.id));
const { data: draws, error: drawError } = await db.from("draws").select("id");
check(drawError, "추첨 기록 읽기");
const { data: prizes, error: prizeError } = await db.from("prizes").select("name").order("sort").order("id");
check(prizeError, "경품 읽기");
// 실제 경품 이름 → 「N번 경품」 (추첨 순서대로)
const prizeAlias = new Map(prizes.map((p, i) => [p.name, `${i + 1}번 경품`]));

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: false, args: ["--mute-audio"] });

// 개발 서버가 화면 구석에 띄우는 Next.js 표시(「N」 버튼, 「Compiling…」)를 감춘다. 운영 화면에는 없는 것이다.
async function newContext(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.appendChild(style);
    });
  });
  return context;
}

// ── 1. 참가자 화면 (휴대폰 크기) ─────────────────────────────────
// 움직임을 끄고 찍어야 카드가 다 나타난 상태로 찍힌다(globals.css 의 reduced-motion 규칙).
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" };

// 전체 길이로 찍으면 고정 배경이 첫 화면 높이에서 끊기므로 배경을 페이지와 함께 늘인다.
// 움직임을 끄면 색종이가 글자 위에 멈춰 있으므로 감춘다.
// 내용이 화면보다 짧을 때도 배경이 끊기지 않게 body 를 화면 높이 이상으로 늘인다.
const PARTICIPANT_STYLE =
  "body { background-attachment: scroll !important; min-height: 100vh; } .confetti { display: none !important; }";

async function participantPage(savedNo) {
  const context = await newContext(phone);
  if (savedNo) await context.addInitScript((no) => localStorage.setItem("participantNo", String(no)), savedNo);
  return context.newPage();
}

{
  const page = await participantPage();
  await page.goto(`${BASE_URL}/?z=${encodeURIComponent(scanZone.qr_token)}`);
  await page.addStyleTag({ content: PARTICIPANT_STYLE });
  await page.getByText("현재 위치").waitFor();
  await page.screenshot({ path: shot("participant-scan") });

  await page.locator("#participant-no").fill(String(partial.participant_no));
  await page.getByRole("button", { name: /방문 인증하기/ }).click();
  await page.locator(".banner").waitFor();
  await page.locator(".status-head").waitFor();
  await page.screenshot({ path: shot("participant-verified"), fullPage: true });
  await page.context().close();
}
{
  const page = await participantPage(completed.participant_no);
  await page.goto(BASE_URL);
  await page.addStyleTag({ content: PARTICIPANT_STYLE });
  await page.locator(".clay").waitFor();
  await page.locator(".status-head").waitFor();
  await page.screenshot({ path: shot("participant-complete"), fullPage: true });
  await page.context().close();
}
{
  const page = await participantPage();
  await page.goto(BASE_URL);
  await page.addStyleTag({ content: PARTICIPANT_STYLE });
  await page.locator("#participant-no").fill(String(partial.participant_no));
  await page.getByRole("button", { name: /현황 확인하기/ }).click();
  // 「인증 현황」 글자는 위쪽 안내문에도 있으므로 현황 카드의 머리글로 기다린다.
  await page.locator(".status-head").waitFor();
  await page.getByRole("button", { name: /현황 확인하기/ }).and(page.locator(":enabled")).waitFor();
  await page.screenshot({ path: shot("participant-lookup"), fullPage: true });
  await page.context().close();
}
console.log(`참가자 화면 4장 완료 (인증 장면: ${partial.participant_no}번, 완주 장면: ${completed.participant_no}번)`);

// ── 2. 관리자 로그인 (운영자가 직접) ─────────────────────────────
const admin = await newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

// 관리자 API 응답(JSON) 안의 경품 이름을 가린 이름으로 바꾼다. 콘솔·경품 목록·발표 화면이 모두 이 API 로 이름을 받는다.
function maskPrizeNames(value) {
  if (typeof value === "string") return prizeAlias.get(value) ?? value;
  if (Array.isArray(value)) return value.map(maskPrizeNames);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskPrizeNames(v)]));
  return value;
}
// 찍기 직전에 화면(입력란 값 포함)에 실제 경품 이름이 남아 있으면 멈춘다. 가리지 못한 이미지를 남기지 않기 위해서다.
async function assertMasked(page) {
  const text = await page.evaluate(() =>
    [document.body.innerText, ...[...document.querySelectorAll("input")].map((i) => i.value)].join("\n"),
  );
  const leaked = [...prizeAlias.keys()].filter((name) => text.includes(name));
  if (leaked.length > 0) throw new Error(`경품 이름 ${leaked.length}개가 가려지지 않았다. 이 실행의 이미지는 쓰지 말 것`);
}
await admin.route("**/api/admin/**", async (route) => {
  const response = await route.fetch();
  if (!(response.headers()["content-type"] ?? "").includes("application/json")) return route.fulfill({ response });
  return route.fulfill({ response, json: maskPrizeNames(await response.json()) });
});
const page = await admin.newPage();
await page.goto(`${BASE_URL}/admin/login?next=%2Fadmin`);
await page.locator("input").first().waitFor();
// 넓은 화면 전체를 찍으면 로그인 카드가 작게 보여 카드만 찍는다.
await page.locator(".card").first().screenshot({ path: shot("admin-login") });
console.log("브라우저 창에서 관리자 비밀번호로 로그인하세요. 5분 동안 기다립니다.");
await page.waitForURL((u) => u.pathname === "/admin", { timeout: LOGIN_TIMEOUT_MS });

// ── 3. 관리자 화면 ───────────────────────────────────────────────
await page.getByText("참가자 목록").waitFor();
await page.getByText("마지막 갱신").waitFor();
await page.locator(".stat").first().waitFor();
await page.waitForFunction(() => !document.body.innerText.includes("불러오는 중"));
await assertMasked(page);
await page.screenshot({ path: shot("admin-console") });
await assertMasked(page);
await page.locator(".console-section", { has: page.getByRole("heading", { name: "경품 목록" }) }).screenshot({ path: shot("admin-prizes") });

await page.goto(`${BASE_URL}/qr`);
await page.locator(".qr-box svg").first().waitFor();
// QR 코드를 가린다. 이미지에 토큰이 남으면 현장에 가지 않고도 인증할 수 있다(D-08).
await page.addStyleTag({
  content: `.qr-box { aspect-ratio: 1; width: 9cm !important; display: flex; align-items: center; justify-content: center;
    background: repeating-linear-gradient(45deg, #efebff 0 12px, #e2dcff 12px 24px); border-radius: 16px; }
  .qr-box svg { display: none !important; }
  .qr-box::after { content: "QR 코드 (보안상 가림)"; font-size: 18px; font-weight: 700; color: #7a72a8; }
  .qr-toolbar .hint-small { display: none !important; }`,
});
// 위쪽 버튼 줄부터 첫 번째 포스터까지만 찍는다.
const firstSheet = await page.locator(".qr-sheet").first().boundingBox();
const toolbar = await page.locator(".qr-toolbar").boundingBox();
await page.screenshot({
  path: shot("admin-qr"),
  fullPage: true,
  clip: { x: toolbar.x - 24, y: Math.max(0, toolbar.y - 16), width: toolbar.width + 48, height: firstSheet.y + firstSheet.height + 16 - Math.max(0, toolbar.y - 16) },
});
console.log("관리자 화면 4장 완료");

// ── 4. 발표 화면 (실제 추첨) ─────────────────────────────────────
if (draws.length > 0) {
  console.log(`추첨 기록이 이미 ${draws.length}건 있어 발표 화면은 건너뜁니다. 추첨 기록을 지운 뒤 다시 실행하세요.`);
} else {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`${BASE_URL}/admin/draw`);
  const startButton = page.getByRole("button", { name: "추첨 시작" });
  const confirmButton = page.getByRole("button", { name: /당첨 확정/ });
  const nextButton = page.getByRole("button", { name: /다음 경품/ });

  await startButton.and(page.locator(":enabled")).waitFor();
  await assertMasked(page);
  await page.screenshot({ path: shot("draw-ready") });

  // 추첨 연출은 3초. 결과(임시) 단계가 나올 때까지 기다린다.
  await startButton.click();
  await confirmButton.waitFor({ timeout: 20_000 });
  await page.locator(".winner-cell").first().click();
  await assertMasked(page);
  await page.screenshot({ path: shot("draw-result") });

  await confirmButton.click();
  await nextButton.and(page.locator(":enabled")).waitFor();
  await assertMasked(page);
  await page.screenshot({ path: shot("draw-confirmed") });

  await page.getByRole("button", { name: "이전 결과" }).click();
  await page.locator(".history-list button").first().click();
  await assertMasked(page);
  await page.screenshot({ path: shot("draw-history") });
  await page.getByRole("button", { name: "닫기" }).click();

  // 남은 경품을 끝까지 추첨·확정해 종료 화면을 만든다.
  while (await nextButton.isEnabled()) {
    await nextButton.click();
    await startButton.and(page.locator(":enabled")).waitFor();
    await startButton.click();
    await confirmButton.waitFor({ timeout: 20_000 });
    await confirmButton.click();
    // 다음 경품이 남았으면 [다음 경품 →]이 켜지고, 마지막이면 종료 화면이 나온다.
    await nextButton.and(page.locator(":enabled")).or(page.locator(".draw-finish")).waitFor();
  }
  await page.locator(".draw-finish").waitFor();
  await assertMasked(page);
  await page.screenshot({ path: shot("draw-finish") });
  console.log("발표 화면 5장 완료. 추첨 기록이 DB 에 남았습니다. 확인 후 지우세요:");
  console.log("  truncate table draw_winners, draws restart identity;");
}

await browser.close();
console.log(`저장 위치: ${OUT_DIR}`);
