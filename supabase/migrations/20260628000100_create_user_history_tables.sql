create table if not exists public.trade_receipts (
  signature text primary key,
  wallet text not null,
  status text not null check (status in ('paper', 'submitted', 'confirmed', 'finalized')),
  slot bigint,
  mode text not null check (mode in ('paper', 'mainnet')),
  side text not null check (side in ('buy', 'sell')),
  input_symbol text not null,
  output_symbol text not null,
  input_amount text not null,
  output_amount double precision not null default 0,
  route text not null default '',
  router text not null default '',
  token_mint text not null,
  explorer_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trade_receipts_wallet_created_idx
on public.trade_receipts (wallet, created_at desc);

create table if not exists public.user_profiles (
  wallet text primary key,
  username text not null,
  display_name text not null,
  bio text not null default '',
  avatar_data_url text not null default '',
  banner_data_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.watchlist_tokens (
  wallet text not null,
  mint text not null,
  created_at timestamptz not null default now(),
  primary key (wallet, mint)
);

alter table public.trade_receipts enable row level security;
alter table public.user_profiles enable row level security;
alter table public.watchlist_tokens enable row level security;

grant select, insert, update on public.trade_receipts to anon, authenticated;
grant select, insert, update on public.user_profiles to anon, authenticated;
grant select, insert, delete on public.watchlist_tokens to anon, authenticated;

drop policy if exists "allow public receipt writes" on public.trade_receipts;
drop policy if exists "allow public receipt reads" on public.trade_receipts;
drop policy if exists "allow public profile upserts" on public.user_profiles;
drop policy if exists "allow public profile reads" on public.user_profiles;
drop policy if exists "allow public watchlist writes" on public.watchlist_tokens;
drop policy if exists "allow public watchlist reads" on public.watchlist_tokens;

create policy "allow public receipt writes"
on public.trade_receipts
for insert
to public
with check (true);

create policy "allow public receipt updates"
on public.trade_receipts
for update
to public
using (true)
with check (true);

create policy "allow public receipt reads"
on public.trade_receipts
for select
to public
using (true);

create policy "allow public profile upserts"
on public.user_profiles
for insert
to public
with check (true);

create policy "allow public profile updates"
on public.user_profiles
for update
to public
using (true)
with check (true);

create policy "allow public profile reads"
on public.user_profiles
for select
to public
using (true);

create policy "allow public watchlist writes"
on public.watchlist_tokens
for insert
to public
with check (true);

create policy "allow public watchlist deletes"
on public.watchlist_tokens
for delete
to public
using (true);

create policy "allow public watchlist reads"
on public.watchlist_tokens
for select
to public
using (true);
