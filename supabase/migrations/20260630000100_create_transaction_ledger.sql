create table if not exists public.transaction_ledger (
  signature text primary key,
  event_type text not null check (event_type in ('swap', 'transfer', 'withdrawal')),
  wallet text not null,
  counterparty_wallet text,
  direction text check (direction in ('buy', 'sell', 'send', 'receive', 'withdrawal')),
  asset_symbol text not null default '',
  asset_mint text not null default '',
  amount text not null default '',
  source_table text not null,
  expected jsonb not null default '{}'::jsonb,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'mismatch', 'failed', 'unavailable')),
  verification_error text,
  chain_slot bigint,
  chain_block_time bigint,
  chain_err jsonb,
  chain_raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transaction_ledger_wallet_created_idx
on public.transaction_ledger (wallet, created_at desc);

create index if not exists transaction_ledger_status_created_idx
on public.transaction_ledger (verification_status, created_at desc);

alter table public.transaction_ledger enable row level security;

grant select on public.transaction_ledger to anon, authenticated;

drop policy if exists "allow public ledger reads" on public.transaction_ledger;

create policy "allow public ledger reads"
on public.transaction_ledger
for select
to public
using (true);
