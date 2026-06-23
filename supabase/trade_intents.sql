create table if not exists public.trade_intents (
  id uuid primary key default gen_random_uuid(),
  wallet text,
  mint text not null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  amount text not null,
  created_at timestamptz not null default now()
);

alter table public.trade_intents enable row level security;

create policy "allow public demo inserts"
on public.trade_intents
for insert
to anon
with check (true);

