-- 0001_init.sql — 테이블 생성 (docs/spec.md 4장)
-- Supabase 대시보드 → SQL Editor에 붙여 넣고 Run. 한 번만 실행한다.

create table participants (            -- 첫 인증 시 생성. 사전 명단은 없다 (D-02)
  participant_no  smallint primary key check (participant_no between 1 and 999),
  created_at      timestamptz not null default now()
);

create table zones (
  id        smallint primary key,
  code      text unique not null,      -- zone1 ~ zone5. 이름이 나오면 name만 바꾼다 (D-15)
  name      text not null,
  qr_token  text unique not null,      -- 추측할 수 없는 랜덤 문자열
  sort      smallint not null
);

create table visits (
  participant_no  smallint references participants on delete cascade,
  zone_id         smallint references zones,
  visited_at      timestamptz not null default now(),
  primary key (participant_no, zone_id)   -- 같은 구역을 두 번 인증할 수 없다
);

create table prizes (                  -- 경품 목록. D-13 확정 후 seed.sql 또는 관리자 콘솔로 입력
  id            serial primary key,
  name          text not null,
  winner_count  smallint not null check (winner_count > 0),
  sort          smallint not null      -- 추첨 순서. 콘솔 표의 줄 순서로 매긴다
);

create table draws (
  id                serial primary key,
  prize_id          int not null references prizes,
  winner_count      smallint not null check (winner_count > 0),   -- 추첨 시점의 인원 (경품 목록에서 복사)
  exclude_previous  boolean not null default true,
  status            text not null default 'pending'
                    check (status in ('pending', 'confirmed')),   -- pending: 임시 결과, confirmed: 확정
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz
);

create table draw_winners (
  draw_id         int references draws on delete cascade,
  participant_no  smallint references participants on delete cascade,
  status          text not null default 'pending'
                  check (status in ('pending', 'confirmed', 'absent')),  -- absent: 부재자로 재추첨됨
  primary key (draw_id, participant_no)   -- 한 회차에 같은 사람이 두 번 당첨될 수 없다
);

-- 모든 테이블에 RLS를 켜고 공개 정책을 만들지 않는다. 서버 전용 키로만 접근한다.
alter table participants enable row level security;
alter table zones        enable row level security;
alter table visits       enable row level security;
alter table prizes       enable row level security;
alter table draws        enable row level security;
alter table draw_winners enable row level security;
