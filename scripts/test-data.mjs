// scripts/test-data.mjs — 개발용 테스트 참가자 넣기·지우기 (spec 7.3 「개발 중에는 900번대 번호」)
//
// 사용법 (저장소 루트에서):
//   node --env-file=.env.local scripts/test-data.mjs seed     900~999번 참가자와 방문 기록을 넣는다 (이미 있는 번호는 건너뜀)
//   node --env-file=.env.local scripts/test-data.mjs status   900번대 데이터 개수를 보여 준다
//   node --env-file=.env.local scripts/test-data.mjs clear    900번대 참가자를 지운다 (방문·당첨 기록은 함께 지워짐)
//
// 넣는 것: participants, visits 만. 구역(zones)·경품(prizes)·추첨(draws)은 건드리지 않는다.
//   추첨 회차를 넣지 않는 이유: 확정 회차가 생기면 그 경품이 「이미 추첨한 경품」이 되어 수정·삭제할 수 없게 된다.
//   추첨은 발표 화면에서 직접 해 본다.
// clear 는 당첨자가 전부 900번대인 회차(= 테스트 추첨)도 지운다. 실제 참가자가 섞인 회차는 지우지 않고 알려 준다.
// 같은 DB 를 로컬·미리보기·운영이 함께 쓰므로(D-16) 900번대 밖은 절대 건드리지 않는다.
import { createClient } from "@supabase/supabase-js";

const FIRST_NO = 900;
const LAST_NO = 999;

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

// 실행할 때마다 같은 데이터가 나오도록 고정 시드 난수를 쓴다 (mulberry32).
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seededRandom(20261027);
const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function countTestRows() {
  const p = await db
    .from("participants")
    .select("participant_no", { count: "exact", head: true })
    .gte("participant_no", FIRST_NO)
    .lte("participant_no", LAST_NO);
  check(p.error, "참가자 세기");
  const v = await db
    .from("visits")
    .select("participant_no", { count: "exact", head: true })
    .gte("participant_no", FIRST_NO)
    .lte("participant_no", LAST_NO);
  check(v.error, "방문 기록 세기");
  const w = await db
    .from("draw_winners")
    .select("participant_no", { count: "exact", head: true })
    .gte("participant_no", FIRST_NO)
    .lte("participant_no", LAST_NO);
  check(w.error, "당첨 기록 세기");
  return { participants: p.count ?? 0, visits: v.count ?? 0, winners: w.count ?? 0 };
}

async function seed() {
  // 이미 있는 900번대 번호(직접 테스트한 기록 등)는 건드리지 않고 건너뛴다.
  const { data: existingRows, error: existingError } = await db
    .from("participants")
    .select("participant_no")
    .gte("participant_no", FIRST_NO)
    .lte("participant_no", LAST_NO);
  check(existingError, "기존 참가자 읽기");
  const existing = new Set(existingRows.map((r) => r.participant_no));

  const { data: zones, error } = await db.from("zones").select("id, sort").order("sort");
  check(error, "구역 읽기");
  if (zones.length === 0) {
    console.error("구역이 없다. supabase/seed.sql 을 먼저 실행할 것");
    process.exit(1);
  }

  // 행사일(2026-10-27) 한국 시간 13:00~16:30 사이에 첫 인증, 이후 5~20분 간격으로 다음 구역
  const eventStart = Date.parse("2026-10-27T13:00:00+09:00");
  const participants = [];
  const visits = [];
  const groups = { completed: 0, inProgress: 0 };

  for (let no = FIRST_NO; no <= LAST_NO; no++) {
    // 900~939: 완주(40명), 940~979: 1~(전체-1)곳(40명), 980~999: 1곳(20명)
    let count;
    if (no < 940) count = zones.length;
    else if (no < 980) count = randInt(1, Math.max(1, zones.length - 1));
    else count = 1;
    let t = eventStart + randInt(0, 210) * 60 * 1000;
    const order = shuffle(zones).slice(0, count);
    // 난수는 먼저 뽑아 두고 건너뛴다. 그래야 기존 번호가 있어도 나머지 번호의 데이터가 매번 같다.
    if (existing.has(no)) continue;
    if (count === zones.length) groups.completed++;
    else groups.inProgress++;
    participants.push({ participant_no: no, created_at: new Date(t).toISOString() });
    for (const z of order) {
      visits.push({ participant_no: no, zone_id: z.id, visited_at: new Date(t).toISOString() });
      t += randInt(5, 20) * 60 * 1000;
    }
  }

  const pr = await db.from("participants").insert(participants);
  check(pr.error, "참가자 넣기");
  const vr = await db.from("visits").insert(visits);
  if (vr.error) {
    // 방문 기록이 실패하면 방금 넣은 참가자만 지워 반쯤 들어간 상태를 남기지 않는다.
    await db.from("participants").delete().in("participant_no", participants.map((p) => p.participant_no));
    check(vr.error, "방문 기록 넣기");
  }

  console.log(
    `넣음: 참가자 ${participants.length}명(완주 ${groups.completed}, 진행 중 ${groups.inProgress}), 방문 기록 ${visits.length}건` +
      (existing.size > 0 ? `. 이미 있던 번호 ${[...existing].join(", ")} 은(는) 건너뜀` : ""),
  );
}

async function clear() {
  // 1. 당첨자가 전부 900번대인 회차는 테스트 추첨이므로 회차째 지운다.
  const { data: draws, error } = await db.from("draws").select("id, draw_winners(participant_no)");
  check(error, "회차 읽기");
  const isTest = (no) => no >= FIRST_NO && no <= LAST_NO;
  const testDrawIds = [];
  const mixedDrawIds = [];
  for (const d of draws) {
    const nos = d.draw_winners.map((w) => w.participant_no);
    if (nos.length === 0 || !nos.some(isTest)) continue;
    if (nos.every(isTest)) testDrawIds.push(d.id);
    else mixedDrawIds.push(d.id);
  }
  if (testDrawIds.length > 0) {
    const r = await db.from("draws").delete().in("id", testDrawIds);
    check(r.error, "테스트 회차 지우기");
  }

  // 2. 900번대 참가자를 지운다. 방문·당첨 기록은 on delete cascade 로 함께 지워진다.
  const before = await countTestRows();
  const r = await db.from("participants").delete().gte("participant_no", FIRST_NO).lte("participant_no", LAST_NO);
  check(r.error, "참가자 지우기");

  console.log(
    `지움: 참가자 ${before.participants}명, 방문 기록 ${before.visits}건, 당첨 기록 ${before.winners}건, 테스트 회차 ${testDrawIds.length}개` +
      (testDrawIds.length > 0 ? ` (id ${testDrawIds.join(", ")})` : ""),
  );
  if (mixedDrawIds.length > 0) {
    console.log(`주의: 900번대와 다른 번호가 섞인 회차 ${mixedDrawIds.join(", ")} 는 지우지 않았다. 확인 후 직접 정리할 것`);
  }
}

async function status() {
  const c = await countTestRows();
  console.log(`900번대: 참가자 ${c.participants}명, 방문 기록 ${c.visits}건, 당첨 기록 ${c.winners}건`);
}

const command = process.argv[2];
if (command === "seed") await seed();
else if (command === "clear") await clear();
else if (command === "status") await status();
else {
  console.error("사용법: node --env-file=.env.local scripts/test-data.mjs seed|status|clear");
  process.exit(1);
}
