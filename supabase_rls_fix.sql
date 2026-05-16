-- ============================================================
-- RLS 정책 수정 스크립트 (재귀 버그 해결)
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- ============================================================

-- ── 1. 재귀 없이 admin 확인하는 헬퍼 함수 ───────────────────
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;


-- ── 2. profiles 정책 재설정 ──────────────────────────────────
drop policy if exists "profiles_select"       on public.profiles;
drop policy if exists "profiles_update_self"  on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

-- 로그인 사용자면 전체 profiles 조회 가능 (역할·부서 확인 필요)
create policy "profiles_select" on public.profiles for select
  using (auth.uid() is not null);

-- 본인 프로필은 본인이 수정
create policy "profiles_update_self" on public.profiles for update
  using (id = auth.uid());

-- admin은 모든 프로필 수정 가능
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin());


-- ── 3. departments 정책 재설정 ───────────────────────────────
drop policy if exists "depts_insert" on public.departments;
drop policy if exists "depts_update" on public.departments;
drop policy if exists "depts_delete" on public.departments;

create policy "depts_insert" on public.departments for insert
  with check (public.is_admin());

create policy "depts_update" on public.departments for update
  using (public.is_admin());

create policy "depts_delete" on public.departments for delete
  using (public.is_admin());


-- ── 4. kpis 정책 재설정 ──────────────────────────────────────
drop policy if exists "kpis_insert" on public.kpis;
drop policy if exists "kpis_update" on public.kpis;
drop policy if exists "kpis_delete" on public.kpis;

create policy "kpis_insert" on public.kpis for insert
  with check (
    public.is_admin()
    or exists(select 1 from public.profiles where id = auth.uid() and dept_id = kpis.dept_id)
  );

create policy "kpis_update" on public.kpis for update
  using (
    public.is_admin()
    or exists(select 1 from public.profiles where id = auth.uid() and dept_id = kpis.dept_id)
  );

create policy "kpis_delete" on public.kpis for delete
  using (
    public.is_admin()
    or exists(select 1 from public.profiles where id = auth.uid() and dept_id = kpis.dept_id)
  );


-- ── 5. kpi_records 정책 재설정 ───────────────────────────────
drop policy if exists "records_insert" on public.kpi_records;
drop policy if exists "records_update" on public.kpi_records;
drop policy if exists "records_delete" on public.kpi_records;

create policy "records_insert" on public.kpi_records for insert
  with check (
    public.is_admin()
    or exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );

create policy "records_update" on public.kpi_records for update
  using (
    public.is_admin()
    or exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );

create policy "records_delete" on public.kpi_records for delete
  using (
    public.is_admin()
    or exists(
      select 1 from public.kpis k
      join public.profiles p on p.id = auth.uid()
      where k.id = kpi_id and k.dept_id = p.dept_id
    )
  );
