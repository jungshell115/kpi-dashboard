-- ============================================================
-- 2026 부서 & 사업 초기 데이터
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- ※ 이미 동일 name이 있으면 skip (충돌 없음)
-- ============================================================

-- ── 1. 부서(departments) 4개 ──────────────────────────────────
insert into public.departments (name, description)
values
  ('사업총괄실',   '기관 전체 사업 총괄 및 기획'),
  ('AI콘텐츠본부', 'AI·디지털 콘텐츠 사업 운영'),
  ('미래산업본부', '미래 산업 육성 및 지원'),
  ('벤처창업본부', '벤처·스타트업 창업 지원')
on conflict (name) do nothing;


-- ── 2. KPI 지표(kpis) – 부서별 사업/지표 등록 ────────────────────
-- dept_id 를 서브쿼리로 자동 조회하므로 UUID 직접 입력 불필요

-- [사업총괄실]
insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '기관 운영', '기관 경영평가 등급', '등급', null, '연간', null
  from public.departments d where d.name = '사업총괄실'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '기관 운영', '예산 집행률', '%', 95, '분기', null
  from public.departments d where d.name = '사업총괄실'
on conflict do nothing;


-- [AI콘텐츠본부]
insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, 'AI콘텐츠 제작지원', 'AI콘텐츠 제작 지원 건수', '건', 30, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, 'AI콘텐츠 제작지원', 'AI 활용 교육 참여자 수', '명', 200, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '디지털콘텐츠 유통지원', '콘텐츠 유통 플랫폼 입점 건수', '건', 20, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '디지털콘텐츠 유통지원', '해외 콘텐츠 수출 계약 건수', '건', 5, '연간', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '콘텐츠 기업 육성', '콘텐츠 기업 컨설팅 건수', '건', 40, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '콘텐츠 기업 육성', '기업 매출 증가율(지원 기업 평균)', '%', 10, '연간', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '영상·미디어 제작지원', '영상 제작 지원 건수', '건', 25, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '영상·미디어 제작지원', '영상 콘텐츠 조회수(누계)', '만회', 500, '분기', null
  from public.departments d where d.name = 'AI콘텐츠본부'
on conflict do nothing;


-- [미래산업본부]
insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '게임·메타버스 육성', '게임·메타버스 기업 지원 건수', '건', 15, '분기', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '게임·메타버스 육성', '게임 쇼케이스 참여 기업 수', '개사', 20, '연간', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '실감콘텐츠 개발지원', 'XR·실감콘텐츠 제작 지원 건수', '건', 10, '분기', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '실감콘텐츠 개발지원', '실감콘텐츠 체험 관람객 수', '명', 3000, '분기', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '충남 콘텐츠 산업 생태계 조성', '산학연 협력 MOU 체결 건수', '건', 5, '연간', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '충남 콘텐츠 산업 생태계 조성', '콘텐츠 인재 양성 교육 이수자', '명', 150, '분기', null
  from public.departments d where d.name = '미래산업본부'
on conflict do nothing;


-- [벤처창업본부]
insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '스타트업 발굴·보육', '입주 기업 선발 건수', '개사', 10, '연간', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '스타트업 발굴·보육', '보육 기업 투자유치 금액', '억원', 20, '연간', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '스타트업 발굴·보육', '보육 기업 고용 인원', '명', 50, '연간', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '창업 교육·멘토링', '창업 교육 프로그램 수료자', '명', 100, '분기', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '창업 교육·멘토링', '멘토링 세션 진행 횟수', '회', 30, '분기', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '투자·IR 지원', '투자 연계 IR 피칭 참여 기업', '개사', 15, '분기', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;

insert into public.kpis (dept_id, project, name, unit, target, cycle, manager)
select d.id, '투자·IR 지원', '졸업 기업 수', '개사', 5, '연간', null
  from public.departments d where d.name = '벤처창업본부'
on conflict do nothing;


-- ── 완료 메시지 ───────────────────────────────────────────────
do $$
begin
  raise notice '✅ 2026 초기 데이터 입력 완료: 부서 4개, KPI 지표 24개';
end $$;
