-- seed.sql — 초기 데이터 (구역 5개, 임시 경품 목록)
-- 0001_init.sql을 실행한 뒤 Supabase SQL Editor에 붙여 넣고 Run. 한 번만 실행한다.
-- qr_token은 실행할 때마다 무작위로 생성되므로, 실행 후 Table Editor의 zones에서 값을 확인해 QR 인쇄에 쓴다.

-- 구역 5곳. 이름이 정해지면 name만 바꾼다 (D-15).
insert into zones (id, code, name, qr_token, sort) values
  (1, 'zone1', '구역 1', replace(gen_random_uuid()::text, '-', ''), 1),
  (2, 'zone2', '구역 2', replace(gen_random_uuid()::text, '-', ''), 2),
  (3, 'zone3', '구역 3', replace(gen_random_uuid()::text, '-', ''), 3),
  (4, 'zone4', '구역 4', replace(gen_random_uuid()::text, '-', ''), 4),
  (5, 'zone5', '구역 5', replace(gen_random_uuid()::text, '-', ''), 5);

-- 임시 경품 목록. 실제 목록이 나오면 관리자 콘솔에서 바꾼다 (D-13).
-- sort 순서대로 추첨한다. 낮은 등급(5등)부터. 등급은 이름에 적는다 (rank 열은 없다).
insert into prizes (name, winner_count, sort) values
  ('5등 경품', 10, 1),
  ('4등 경품',  5, 2),
  ('3등 경품',  3, 3),
  ('2등 경품',  2, 4),
  ('1등 경품',  1, 5);

-- 확인용: 넣은 결과를 바로 보여 준다.
select id, code, name, qr_token, sort from zones order by sort;
