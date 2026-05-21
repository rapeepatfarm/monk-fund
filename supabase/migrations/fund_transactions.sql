-- ============================================================
-- กองทุนพระอาพาธ — Fund Transactions Table
-- รันใน Supabase SQL Editor (New Query)
-- ============================================================

create table if not exists fund_transactions (
  id               uuid primary key default gen_random_uuid(),
  province_id      uuid references provinces(id) on delete cascade,
  member_id        uuid references members(id) on delete cascade,
  national_id      text not null,
  type             text not null check (type in ('income', 'expense')),
  category         text not null check (category in ('membership', 'claim')),
  reference_id     uuid,                          -- membership id หรือ claim id
  amount           numeric(10,2) not null,
  note             text,
  transaction_date date not null,
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now()
);

alter table fund_transactions enable row level security;

create policy "fund_transactions_policy" on fund_transactions
  for all using (
    is_super_admin() or province_id = get_my_province_id()
  );

-- Index สำหรับ query เร็ว
create index if not exists fund_transactions_province_idx  on fund_transactions(province_id);
create index if not exists fund_transactions_member_idx    on fund_transactions(member_id);
create index if not exists fund_transactions_date_idx      on fund_transactions(transaction_date);
create index if not exists fund_transactions_type_idx      on fund_transactions(type);
