create table if not exists public.wallet_transfers (
  signature text primary key,
  sender_wallet text not null,
  recipient_wallet text not null,
  asset_symbol text not null,
  asset_mint text not null,
  amount text not null,
  note text not null default '',
  status text not null check (status in ('submitted', 'confirmed', 'finalized')),
  slot bigint,
  explorer_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wallet_transfers_sender_created_idx
on public.wallet_transfers (sender_wallet, created_at desc);

create index if not exists wallet_transfers_recipient_created_idx
on public.wallet_transfers (recipient_wallet, created_at desc);

alter table public.wallet_transfers enable row level security;

grant select, insert, update on public.wallet_transfers to anon, authenticated;

drop policy if exists "allow public transfer writes" on public.wallet_transfers;
drop policy if exists "allow public transfer updates" on public.wallet_transfers;
drop policy if exists "allow public transfer reads" on public.wallet_transfers;

create policy "allow public transfer writes"
on public.wallet_transfers
for insert
to public
with check (true);

create policy "allow public transfer updates"
on public.wallet_transfers
for update
to public
using (true)
with check (true);

create policy "allow public transfer reads"
on public.wallet_transfers
for select
to public
using (true);
