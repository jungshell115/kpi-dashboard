-- ============================================================
-- 입주기업 관리 테이블 생성
-- Supabase Dashboard > SQL Editor 에서 전체 실행
-- ============================================================

-- ── 1. spaces (공간) ────────────────────────────────────────
create table if not exists public.spaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  location   text,
  dept_id    uuid references public.departments(id) on delete set null,
  description text,
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.spaces enable row level security;

-- ── 2. rooms (호실) ─────────────────────────────────────────
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references public.spaces(id) on delete cascade,
  room_no    text not null,          -- "201호", "A-103" 등 자유 입력
  room_type  text not null default '기타', -- "1인실","3인실","5인실","대형","기타"
  capacity   int  not null default 1,     -- 정원 (숫자)
  area_m2    numeric(6,2),               -- 면적 (선택)
  status     text not null default '공실'
             check (status in ('공실','점유','유지보수','비활성')),
  notes      text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;

-- ── 3. tenants (입주기업) ────────────────────────────────────
create table if not exists public.tenants (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  ceo_name         text,
  business_type    text,              -- 업종
  contact          text,              -- 연락처
  registration_no  text,              -- 사업자번호 (선택)
  notes            text,
  created_at       timestamptz not null default now()
);
alter table public.tenants enable row level security;

-- ── 4. tenant_rooms (기업-호실 배정) ──────────────────────────
create table if not exists public.tenant_rooms (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  room_id         uuid not null references public.rooms(id) on delete cascade,
  project_name    text,               -- 연결된 운영사업명
  start_date      date not null,      -- 입주일
  expected_end    date,               -- 퇴실예정일
  end_date        date,               -- 실제 퇴실일 (null = 현재 사용중)
  exit_reason     text,               -- 퇴실 사유
  created_at      timestamptz not null default now()
);
alter table public.tenant_rooms enable row level security;

-- ── 5. tenant_records (기업 연간실적) ──────────────────────────
create table if not exists public.tenant_records (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  year                 int  not null,

  employee_count       int,

  -- 매출
  revenue_amount       numeric(18,2),
  revenue_currency     text not null default 'KRW' check (revenue_currency in ('KRW','USD')),
  revenue_rate         numeric(10,2),  -- USD 입력 시 환율
  revenue_krw          numeric(18,2),  -- 항상 원화 환산값 저장

  -- 투자유치
  investment_amount    numeric(18,2),
  investment_currency  text not null default 'KRW' check (investment_currency in ('KRW','USD')),
  investment_rate      numeric(10,2),
  investment_krw       numeric(18,2),

  patent_count         int,
  graduation_status    text default '재입주'
                       check (graduation_status in ('재입주','졸업','퇴소','해당없음')),
  notes                text,
  created_at           timestamptz not null default now(),
  unique (tenant_id, year)
);
alter table public.tenant_records enable row level security;

-- ── 6. RLS 정책 ─────────────────────────────────────────────

-- spaces
create policy "spaces_select" on public.spaces for select using (auth.uid() is not null);
create policy "spaces_insert" on public.spaces for insert with check (public.is_admin());
create policy "spaces_update" on public.spaces for update using (public.is_admin());
create policy "spaces_delete" on public.spaces for delete using (public.is_admin());

-- rooms
create policy "rooms_select" on public.rooms for select using (auth.uid() is not null);
create policy "rooms_insert" on public.rooms for insert with check (public.is_admin());
create policy "rooms_update" on public.rooms for update using (public.is_admin());
create policy "rooms_delete" on public.rooms for delete using (public.is_admin());

-- tenants
create policy "tenants_select" on public.tenants for select using (auth.uid() is not null);
create policy "tenants_insert" on public.tenants for insert with check (public.is_admin());
create policy "tenants_update" on public.tenants for update using (public.is_admin());
create policy "tenants_delete" on public.tenants for delete using (public.is_admin());

-- tenant_rooms
create policy "tenant_rooms_select" on public.tenant_rooms for select using (auth.uid() is not null);
create policy "tenant_rooms_insert" on public.tenant_rooms for insert with check (public.is_admin());
create policy "tenant_rooms_update" on public.tenant_rooms for update using (public.is_admin());
create policy "tenant_rooms_delete" on public.tenant_rooms for delete using (public.is_admin());

-- tenant_records
create policy "tenant_records_select" on public.tenant_records for select using (auth.uid() is not null);
create policy "tenant_records_insert" on public.tenant_records for insert with check (public.is_admin());
create policy "tenant_records_update" on public.tenant_records for update using (public.is_admin());
create policy "tenant_records_delete" on public.tenant_records for delete using (public.is_admin());

-- ── 7. 인덱스 ────────────────────────────────────────────────
create index if not exists idx_rooms_space        on public.rooms(space_id);
create index if not exists idx_tenant_rooms_tenant on public.tenant_rooms(tenant_id);
create index if not exists idx_tenant_rooms_room   on public.tenant_rooms(room_id);
create index if not exists idx_tenant_rooms_active on public.tenant_rooms(end_date) where end_date is null;
create index if not exists idx_tenant_records_year on public.tenant_records(tenant_id, year);
