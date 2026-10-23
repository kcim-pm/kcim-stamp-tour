-- 0002_draw_targets.sql — 추첨 대상 지정 (docs/spec.md 4장, A-27, D-24)
-- 0001_init.sql 을 실행한 운영 DB 에 Supabase 대시보드 → SQL Editor 로 붙여 넣고 Run. 한 번만 실행한다.
-- 기존 행은 모두 false 가 되므로 실행 직후 추첨 동작은 이전과 같다.

alter table participants add column targeted     boolean not null default false;  -- 콘솔 참가자 목록의 「추첨 대상」 체크
alter table prizes       add column use_targeted boolean not null default false;  -- 콘솔 경품 목록의 「대상자 적용」 체크
