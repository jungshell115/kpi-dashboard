-- ============================================================
-- 2025년 KPI 실적 초기 데이터
-- 출처: 2025사업연도 결산보고서 (사업실적 발췌)
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- ============================================================

-- ── 1. 2025년 5대 경영목표 KPI (사업총괄실 소속) ──────────────

insert into public.kpis (dept_id, project, name, unit, target, cycle, year, threshold, manager)
select d.id, '5대 경영목표', '디지털 융합 콘텐츠 IP 발굴 육성', '건',   198,   '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
union all
select d.id, '5대 경영목표', '지원기업 매출액',                  '백만원', 33094, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
union all
select d.id, '5대 경영목표', '전문인력 양성',                   '명',   1041,  '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
union all
select d.id, '5대 경영목표', '일자리 창출',                     '명',   270,   '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
union all
select d.id, '5대 경영목표', '투자유치',                        '백만원', 6000,  '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
on conflict do nothing;

-- 5대 경영목표 실적 입력
insert into public.kpi_records (kpi_id, period, actual, entered_at)
select k.id, '연간', 231,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='디지털 융합 콘텐츠 IP 발굴 육성'
union all
select k.id, '연간', 77690, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='지원기업 매출액'
union all
select k.id, '연간', 1540,  '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='전문인력 양성'
union all
select k.id, '연간', 399,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='일자리 창출'
union all
select k.id, '연간', 17530, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='투자유치';


-- ── 2. 사업총괄실 주요 사업 KPI ─────────────────────────────────

insert into public.kpis (dept_id, project, name, unit, target, cycle, year, threshold, manager)
select d.id, '지역특화콘텐츠개발지원', '교육 지원',       '명', 80, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실' union all
select d.id, '지역특화콘텐츠개발지원', '인턴십 지원',     '명', 25, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실' union all
select d.id, '지역특화콘텐츠개발지원', '고용 창출',       '명',  3, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실' union all
select d.id, '지역특화콘텐츠개발지원', '콘텐츠 제작',     '건',  5, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실' union all
select d.id, '지역특화콘텐츠개발지원', '콘텐츠 활용',     '회',  2, '연1회', 2025, 100, null from public.departments d where d.name='사업총괄실'
on conflict do nothing;

insert into public.kpi_records (kpi_id, period, actual, entered_at)
select k.id,'연간',95, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='교육 지원' union all
select k.id,'연간',25, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='인턴십 지원' union all
select k.id,'연간', 5, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='고용 창출' union all
select k.id,'연간', 5, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='콘텐츠 제작' union all
select k.id,'연간', 3, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='사업총괄실' and k.year=2025 and k.name='콘텐츠 활용';


-- ── 3. AI콘텐츠본부 KPI ──────────────────────────────────────────

insert into public.kpis (dept_id, project, name, unit, target, cycle, year, threshold, manager)
-- 충남콘텐츠코리아랩
select d.id,'충남콘텐츠코리아랩 운영','창·제작 건수',          '건',   70,  '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남콘텐츠코리아랩 운영','교육생 수',             '명',  550,  '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남콘텐츠코리아랩 운영','사업화 건수',           '건',  140,  '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남콘텐츠코리아랩 운영','매출액',               '백만원',664, '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
-- 충남음악창작소
select d.id,'충남음악창작소 운영','창 제작 지원',              '건',  25,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남음악창작소 운영','공연 지원',                 '건',  12,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남음악창작소 운영','교육 운영',                 '명',  21,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'충남음악창작소 운영','지적재산권',                '건',  14,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
-- 충남영상영화산업
select d.id,'충남 영상·영화산업 육성','도민초청 특별상영회',   '회',   5,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
-- 천안시 창작스튜디오
select d.id,'천안시 창작스튜디오 운영','스토리IP 특화교육',    '명',  30,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부' union all
select d.id,'천안시 창작스튜디오 운영','콘텐츠 단기 특화교육', '명', 100,   '연1회',2025,100,null from public.departments d where d.name='AI콘텐츠본부'
on conflict do nothing;

insert into public.kpi_records (kpi_id, period, actual, entered_at)
select k.id,'연간',303, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='창·제작 건수' union all
select k.id,'연간',726, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='교육생 수' union all
select k.id,'연간',153, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='사업화 건수' union all
select k.id,'연간',560, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='매출액' union all
select k.id,'연간', 25, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='창 제작 지원' union all
select k.id,'연간', 28, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='공연 지원' union all
select k.id,'연간', 29, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='교육 운영' union all
select k.id,'연간', 24, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='지적재산권' union all
select k.id,'연간',  5, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='도민초청 특별상영회' union all
select k.id,'연간', 42, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='스토리IP 특화교육' union all
select k.id,'연간',107, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='AI콘텐츠본부' and k.year=2025 and k.name='콘텐츠 단기 특화교육';


-- ── 4. 미래산업본부 KPI ──────────────────────────────────────────

insert into public.kpis (dept_id, project, name, unit, target, cycle, year, threshold, manager)
-- 충남콘텐츠기업지원센터
select d.id,'충남콘텐츠기업지원센터 운영','입주기업 수',       '개사',  22,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남콘텐츠기업지원센터 운영','기업 매출액',       '백만원',11000, '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남콘텐츠기업지원센터 운영','지원기업 수',       '건',    21,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남콘텐츠기업지원센터 운영','신규 일자리 창출',  '명',   100,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
-- 충남글로벌게임센터
select d.id,'충남글로벌게임센터 운영','인디게임파크 신규창업', '팀',    5,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남글로벌게임센터 운영','게임 개발 실무교육',   '명',   100,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남글로벌게임센터 운영','매출액',               '백만원',6230,  '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남글로벌게임센터 운영','신규 일자리 창출',     '명',    40,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
-- 충남메타버스지원센터
select d.id,'충남메타버스지원센터 운영','전문인력 양성',       '명',   80,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남메타버스지원센터 운영','매출액',              '백만원',2000,  '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
-- 충남이스포츠메카조성
select d.id,'충남이스포츠 메카조성','대회 개최 및 참가',      '회',    4,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부' union all
select d.id,'충남이스포츠 메카조성','인력 양성',              '명',   50,    '연1회',2025,100,null from public.departments d where d.name='미래산업본부'
on conflict do nothing;

insert into public.kpi_records (kpi_id, period, actual, entered_at)
select k.id,'연간', 22,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='입주기업 수' union all
select k.id,'연간', 29495, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='기업 매출액' union all
select k.id,'연간', 24,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='지원기업 수' union all
select k.id,'연간', 117,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='신규 일자리 창출' and k.project='충남콘텐츠기업지원센터 운영' union all
select k.id,'연간', 10,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='인디게임파크 신규창업' union all
select k.id,'연간', 294,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='게임 개발 실무교육' union all
select k.id,'연간', 8604,  '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='매출액' and k.project='충남글로벌게임센터 운영' union all
select k.id,'연간', 48,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='신규 일자리 창출' and k.project='충남글로벌게임센터 운영' union all
select k.id,'연간', 143,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='전문인력 양성' union all
select k.id,'연간', 2270,  '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='매출액' and k.project='충남메타버스지원센터 운영' union all
select k.id,'연간', 5,     '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='대회 개최 및 참가' union all
select k.id,'연간', 67,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='미래산업본부' and k.year=2025 and k.name='인력 양성';


-- ── 5. 벤처창업본부 KPI ──────────────────────────────────────────

insert into public.kpis (dept_id, project, name, unit, target, cycle, year, threshold, manager)
-- 그린스타트업타운
select d.id,'그린스타트업타운 운영','기업 입주 지원',          '개사',  25,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
select d.id,'그린스타트업타운 운영','매출액',                  '백만원',13200, '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
select d.id,'그린스타트업타운 운영','일자리 창출',             '명',    60,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
select d.id,'그린스타트업타운 운영','투자유치',                '백만원',6000,  '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
select d.id,'그린스타트업타운 운영','인력 양성',               '명',    20,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
select d.id,'그린스타트업타운 운영','지원 사업',               '건',    66,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
-- 천안문화도시
select d.id,'천안문화도시 운영','지원 사업',                   '건',    21,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부' union all
-- 천안시창조문화산업지원센터
select d.id,'천안시창조문화산업지원센터','신규 입주',           '개사',   1,    '연1회',2025,100,null from public.departments d where d.name='벤처창업본부'
on conflict do nothing;

insert into public.kpi_records (kpi_id, period, actual, entered_at)
select k.id,'연간', 30,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='기업 입주 지원' union all
select k.id,'연간', 36761, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='매출액' union all
select k.id,'연간', 167,   '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='일자리 창출' union all
select k.id,'연간', 13630, '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='투자유치' union all
select k.id,'연간', 23,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='인력 양성' union all
select k.id,'연간', 88,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='지원 사업' union all
select k.id,'연간', 21,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='지원 사업' and k.project='천안문화도시 운영' union all
select k.id,'연간',  2,    '2025-12-31'::timestamptz from public.kpis k join public.departments d on k.dept_id=d.id where d.name='벤처창업본부' and k.year=2025 and k.name='신규 입주';


-- ── 완료 메시지 ──────────────────────────────────────────────────
do $$
begin
  raise notice '✅ 2025년 KPI 실적 데이터 입력 완료';
  raise notice '   - 5대 경영목표: 달성률 평균 187.86%%';
  raise notice '   - 전체 목표 초과 달성 (최고 292%% - 투자유치)';
end $$;
