-- ============================================================
-- KPI 성과관리 시스템 · Supabase 설정 스크립트
-- 충남도 출연기관 경영혁신본부
-- 실행 순서: Supabase Dashboard > SQL Editor 에 붙여넣고 Run
-- ============================================================


-- ── 0. 기존 테이블 초기화 (재실행 시 필요) ──────────────────────────
drop table if exists public.kpi_records cascade;
drop table if exists public.kpis cascade;
drop table if exists public.departments cascade;
drop table if exists public.profiles cascade;


-- ── 1. 사용자 프로필 ────────────────────────────────────────────────
-- auth.users 와 1:1 연결. role: 'admin'(차장) | 'member'(부서 담당자)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  name        text not null default '',
  role        text not null default 'member' check (role in ('admin','member')),
  dept_id     uuid,                      -- member 는 자기 부서만 편집 가능
  created_at  timestamptz default now()
);

-- 신규 가입 시 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. 부서 ─────────────────────────────────────────────────────────
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

-- profiles 의 dept_id 외래키 뒤늦게 추가
alter table public.profiles
  add constraint profiles_dept_id_fkey
  foreign key (dept_id) references public.departments(id) on delete set null;


-- ── 3. KPI 지표 ──────────────────────────────────────────────────────
create table public.kpis (
  id          uuid primary key default gen_random_uuid(),
  year        int  not null,
  dept_id     uuid not null references public.departments(id) on delete cascade,
  project     text not null,
  name        text not null,
  target      numeric not null,
  unit        text not null,
  cycle       text not null,            -- 월별 / 분기별 / 반기별 / 연1회
  manager     text not null default '',
  threshold   int  not null default 100,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);


-- ── 4. 실적 이력 ─────────────────────────────────────────────────────
create table public.kpi_records (
  id          uuid primary key default gen_random_uuid(),
  kpi_id      uuid not null references public.kpis(id) on delete cascade,
  period      text not null,            -- 1분기 / 상반기 / 1월 / 연간
  actual      numeric not null,
  evidence    text default '',
  note        text default '',
  entered_by  uuid references auth.users(id),
  entered_at  timestamptz default now(),
  unique(kpi_id, period)               -- 기간별 1건만 허용
);


-- ── 5. updated_at 자동 갱신 트리거 ──────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger kpis_updated_at
  before update on public.kpis
  for each row execute function public.set_updated_at();


-- ── 6. RLS (Row Level Security) 활성화 ──────────────────────────────
alter table public.profiles    enable row level security;
alter table public.departments enable row level security;
alter table public.kpis        enable row level security;
alter table public.kpi_records enable row level security;


-- ── 7. RLS 정책 ──────────────────────────────────────────────────────

-- profiles: 본인 프로필만 조회·수정. admin 은 전체 조회.
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());
create policy "profiles_update_admin" on public.profiles for update
  using (exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- departments: 로그인 사용자 전체 조회. admin 만 CUD.
create policy "depts_select" on public.departments for select
  using (auth.uid() is not null);
create policy "depts_insert" on public.departments for insert
  with check (exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "depts_update" on public.departments for update
  using (exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));
create policy "depts_delete" on public.departments for delete
  using (exists(
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- kpis: 전체 조회. admin 은 전체 CUD. member 는 자기 부서만 CUD.
create policy "kpis_select" on public.kpis for select
  using (auth.uid() is not null);

create policy "kpis_insert" on public.kpis for insert
  with check (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.dept_id = dept_id)
  );

create policy "kpis_update" on public.kpis for update
  using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.dept_id = dept_id)
  );

create policy "kpis_delete" on public.kpis for delete
  using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.dept_id = dept_id)
  );

-- kpi_records: 전체 조회. admin 전체 CUD. member 는 자기 부서 KPI 에만.
create policy "records_select" on public.kpi_records for select
  using (auth.uid() is not null);

create policy "records_insert" on public.kpi_records for insert
  with check (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );

create policy "records_update" on public.kpi_records for update
  using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );

create policy "records_delete" on public.kpi_records for delete
  using (
    exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or
    exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );


-- ── 8. Realtime 활성화 ───────────────────────────────────────────────
-- Supabase Dashboard > Database > Replication 에서 아래 테이블 체크:
-- ✅ kpis   ✅ kpi_records   ✅ departments

-- 또는 SQL로:
alter publication supabase_realtime add table public.kpis;
alter publication supabase_realtime add table public.kpi_records;
alter publication supabase_realtime add table public.departments;


-- ── 9. 샘플 데이터 (선택 - 테스트용) ───────────────────────────────
-- 아래 주석을 해제하면 샘플 부서 5개가 생성됩니다.
-- 실운영 시에는 주석 처리 유지 권장.

/*
insert into public.departments (name, sort_order) values
  ('기획조정팀',  1),
  ('경영지원팀',  2),
  ('사업1팀',     3),
  ('사업2팀',     4),
  ('홍보팀',      5);
*/


-- ── 10. 관리자 계정 role 설정 ────────────────────────────────────────
-- 가입 후 아래 쿼리로 차장님 계정을 admin 으로 변경하세요.
-- (이메일 주소를 실제 차장님 이메일로 교체)

/*
update public.profiles
set role = 'admin'
where email = 'jungsi@example.com';   -- ← 이메일 교체
*/


-- ── 완료 안내 ────────────────────────────────────────────────────────
-- 1. 위 SQL 전체를 Supabase SQL Editor 에서 실행
-- 2. Authentication > Email 설정 확인 (Confirm email: 운영환경에선 ON 권장)
-- 3. React 코드의 SUPABASE_URL / SUPABASE_ANON_KEY 를
--    Supabase Dashboard > Settings > API 에서 복사하여 입력
-- 4. 가입 후 차장님 계정 role을 admin 으로 UPDATE (10번 쿼리 참고)
-- 5. 각 부서 담당자 계정 생성 후 dept_id 를 해당 부서 UUID 로 UPDATE
