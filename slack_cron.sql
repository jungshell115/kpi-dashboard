-- ============================================================
-- KPI 슬랙 알림 자동 스케줄 설정
-- Supabase Dashboard > SQL Editor 에서 실행
-- ※ pg_cron + pg_net 확장이 활성화되어 있어야 합니다
-- ============================================================

-- ── 1. 확장 활성화 (이미 돼 있으면 skip) ─────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── 2. 기존 스케줄 제거 (중복 방지) ──────────────────────────
select cron.unschedule('kpi-slack-alert') where exists (
  select 1 from cron.job where jobname = 'kpi-slack-alert'
);

-- ── 3. 매주 월요일 오전 9시 실행 (KST = UTC+9 → UTC 00:00) ──
-- cron 표현식: 분 시 일 월 요일
-- '0 0 * * 1' = 매주 월요일 UTC 00:00 = KST 09:00
select cron.schedule(
  'kpi-slack-alert',           -- 스케줄 이름
  '0 0 * * 1',                 -- 매주 월요일 KST 09:00
  $$
    select net.http_post(
      url     := 'https://jvjsgapxykuixwkseyqw.supabase.co/functions/v1/slack-kpi-alert',
      headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);

-- ── 확인: 등록된 스케줄 목록 ─────────────────────────────────
select jobname, schedule, active from cron.job;
