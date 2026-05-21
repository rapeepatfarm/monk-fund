-- ============================================================
-- กองทุนพระอาพาธ — Supabase Schema
-- วิธีใช้: รัน SQL นี้ใน Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- Tables
-- ============================================================

create table if not exists provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_at timestamptz default now()
);

create table if not exists temples (
  id uuid primary key default gen_random_uuid(),
  province_id uuid references provinces(id) on delete cascade,
  name text not null,
  address text,
  district text,
  amphoe text,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  province_id uuid references provinces(id) on delete cascade,
  temple_id uuid references temples(id),
  prefix text check (prefix in ('พระ', 'สามเณร')),
  first_name text not null,
  last_name text not null,
  national_id text unique,
  phone text,
  payment_channel text,
  status text default 'active' check (status in ('active', 'inactive', 'deceased')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  year int not null,
  paid_date date,
  amount numeric(10,2),
  status text default 'active' check (status in ('active', 'expired')),
  created_at timestamptz default now(),
  unique (member_id, year)
);

create table if not exists benefit_rules (
  id uuid primary key default gen_random_uuid(),
  province_id uuid references provinces(id) on delete cascade,
  benefit_type text check (benefit_type in ('accident', 'hospitalization', 'bedridden', 'death')),
  description text,
  max_per_event numeric(10,2),
  max_per_year numeric(10,2),
  rate_per_unit numeric(10,2),
  unit text default 'baht' check (unit in ('baht', 'night', 'month', 'event')),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  membership_id uuid references memberships(id),
  benefit_rule_id uuid references benefit_rules(id),
  claim_date date not null,
  amount_requested numeric(10,2),
  amount_approved numeric(10,2),
  units numeric(10,2),
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  evidence_urls text[],
  note text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  province_id uuid references provinces(id),
  full_name text,
  role text default 'province_admin' check (role in ('province_admin', 'super_admin')),
  created_at timestamptz default now()
);

-- ============================================================
-- Updated_at trigger for members
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_updated_at on members;
create trigger members_updated_at
  before update on members
  for each row execute function update_updated_at();

-- ============================================================
-- Auto-create user_profile on signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table provinces enable row level security;
alter table temples enable row level security;
alter table members enable row level security;
alter table memberships enable row level security;
alter table benefit_rules enable row level security;
alter table claims enable row level security;
alter table user_profiles enable row level security;

-- Helper function
create or replace function get_my_province_id()
returns uuid as $$
  select province_id from user_profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_super_admin()
returns boolean as $$
  select exists (select 1 from user_profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer stable;

-- provinces: all authenticated users can read
create policy "provinces_read" on provinces
  for select using (auth.uid() is not null);

create policy "provinces_write" on provinces
  for all using (is_super_admin());

-- temples
create policy "temples_read" on temples
  for select using (
    is_super_admin() or province_id = get_my_province_id()
  );

create policy "temples_write" on temples
  for all using (
    is_super_admin() or province_id = get_my_province_id()
  );

-- members
create policy "members_policy" on members
  for all using (
    is_super_admin() or province_id = get_my_province_id()
  );

-- memberships
create policy "memberships_policy" on memberships
  for all using (
    is_super_admin() or (
      select province_id from members where id = memberships.member_id
    ) = get_my_province_id()
  );

-- benefit_rules
create policy "benefit_rules_policy" on benefit_rules
  for all using (
    is_super_admin() or province_id = get_my_province_id()
  );

-- claims
create policy "claims_policy" on claims
  for all using (
    is_super_admin() or (
      select province_id from members where id = claims.member_id
    ) = get_my_province_id()
  );

-- user_profiles
create policy "user_profiles_own" on user_profiles
  for select using (id = auth.uid() or is_super_admin());

create policy "user_profiles_update_own" on user_profiles
  for update using (id = auth.uid());

create policy "user_profiles_super_admin" on user_profiles
  for all using (is_super_admin());

-- ============================================================
-- Seed: provinces (77 จังหวัด — ตัวอย่างบางส่วน)
-- ============================================================
insert into provinces (name, code) values
  ('กรุงเทพมหานคร', 'BKK'),
  ('กระบี่', 'KBI'),
  ('กาญจนบุรี', 'KAN'),
  ('กาฬสินธุ์', 'KSN'),
  ('กำแพงเพชร', 'KPT'),
  ('ขอนแก่น', 'KKN'),
  ('จันทบุรี', 'CTI'),
  ('ฉะเชิงเทรา', 'CCO'),
  ('ชลบุรี', 'CBI'),
  ('ชัยนาท', 'CNT'),
  ('ชัยภูมิ', 'CPM'),
  ('ชุมพร', 'CPN'),
  ('เชียงราย', 'CRI'),
  ('เชียงใหม่', 'CNX'),
  ('ตรัง', 'TRG'),
  ('ตราด', 'TRT'),
  ('ตาก', 'TAK'),
  ('นครนายก', 'NYK'),
  ('นครปฐม', 'NPT'),
  ('นครพนม', 'NPM'),
  ('นครราชสีมา', 'NMA'),
  ('นครศรีธรรมราช', 'NST'),
  ('นครสวรรค์', 'NSN'),
  ('นนทบุรี', 'NBI'),
  ('นราธิวาส', 'NWT'),
  ('น่าน', 'NAN'),
  ('บึงกาฬ', 'BKN'),
  ('บุรีรัมย์', 'BRM'),
  ('ปทุมธานี', 'PTE'),
  ('ประจวบคีรีขันธ์', 'PKN'),
  ('ปราจีนบุรี', 'PRI'),
  ('ปัตตานี', 'PTN'),
  ('พระนครศรีอยุธยา', 'AYA'),
  ('พะเยา', 'PYO'),
  ('พังงา', 'PNA'),
  ('พัทลุง', 'PLG'),
  ('พิจิตร', 'PCT'),
  ('พิษณุโลก', 'PLK'),
  ('เพชรบุรี', 'PBI'),
  ('เพชรบูรณ์', 'PNB'),
  ('แพร่', 'PRE'),
  ('ภูเก็ต', 'HKT'),
  ('มหาสารคาม', 'MKM'),
  ('มุกดาหาร', 'MDH'),
  ('แม่ฮ่องสอน', 'MSN'),
  ('ยโสธร', 'YST'),
  ('ยะลา', 'YLA'),
  ('ร้อยเอ็ด', 'ROI'),
  ('ระนอง', 'RNG'),
  ('ระยอง', 'RYG'),
  ('ราชบุรี', 'RBR'),
  ('ลพบุรี', 'LRI'),
  ('ลำปาง', 'LPG'),
  ('ลำพูน', 'LPN'),
  ('เลย', 'LEI'),
  ('ศรีสะเกษ', 'SSK'),
  ('สกลนคร', 'SNK'),
  ('สงขลา', 'SKA'),
  ('สตูล', 'STN'),
  ('สมุทรปราการ', 'SPK'),
  ('สมุทรสงคราม', 'SKM'),
  ('สมุทรสาคร', 'SKN'),
  ('สระแก้ว', 'SKW'),
  ('สระบุรี', 'SRI'),
  ('สิงห์บุรี', 'SBR'),
  ('สุโขทัย', 'STI'),
  ('สุพรรณบุรี', 'SPB'),
  ('สุราษฎร์ธานี', 'SNI'),
  ('สุรินทร์', 'SRN'),
  ('หนองคาย', 'NKI'),
  ('หนองบัวลำภู', 'NBL'),
  ('อ่างทอง', 'ATG'),
  ('อำนาจเจริญ', 'ACR'),
  ('อุดรธานี', 'UDN'),
  ('อุตรดิตถ์', 'UTD'),
  ('อุทัยธานี', 'UTI'),
  ('อุบลราชธานี', 'UBN')
on conflict (code) do nothing;

-- ============================================================
-- Seed: default benefit rules for กรุงเทพมหานคร
-- (ปรับใช้กับจังหวัดที่ต้องการ)
-- ============================================================
-- INSERT ด้วย province_id หลังจาก provinces ถูกสร้างแล้ว:
/*
insert into benefit_rules (province_id, benefit_type, description, max_per_event, max_per_year, unit)
select id, 'accident', 'อุบัติเหตุ เบิกตามจริง', 20000, 20000, 'baht' from provinces where code = 'BKK';

insert into benefit_rules (province_id, benefit_type, description, max_per_year, rate_per_unit, unit)
select id, 'hospitalization', 'นอนโรงพยาบาล', 30000, 1000, 'night' from provinces where code = 'BKK';

insert into benefit_rules (province_id, benefit_type, description, max_per_year, rate_per_unit, unit)
select id, 'bedridden', 'ป่วยติดเตียง', 36000, 3000, 'month' from provinces where code = 'BKK';

insert into benefit_rules (province_id, benefit_type, description, max_per_event, unit)
select id, 'death', 'มรณภาพ', 25000, 'event' from provinces where code = 'BKK';
*/
