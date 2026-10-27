create table if not exists public.user_follows (
  follower_wallet text not null,
  target_wallet text not null,
  created_at timestamptz not null default now(),
  primary key (follower_wallet, target_wallet),
  check (follower_wallet <> target_wallet)
);

create index if not exists user_follows_follower_created_idx
on public.user_follows (follower_wallet, created_at desc);

create index if not exists user_follows_target_created_idx
on public.user_follows (target_wallet, created_at desc);

alter table public.user_follows enable row level security;

grant select, insert, delete on public.user_follows to anon, authenticated;

drop policy if exists "allow public follow writes" on public.user_follows;
drop policy if exists "allow public follow deletes" on public.user_follows;
drop policy if exists "allow public follow reads" on public.user_follows;

create policy "allow public follow writes"
on public.user_follows
for insert
to public
with check (true);

create policy "allow public follow deletes"
on public.user_follows
for delete
to public
using (true);

create policy "allow public follow reads"
on public.user_follows
for select
to public
using (true);
