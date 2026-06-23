grant usage on schema public to anon, authenticated;
grant insert on public.trade_intents to anon, authenticated;

drop policy if exists "allow public demo inserts" on public.trade_intents;

create policy "allow public demo inserts"
on public.trade_intents
for insert
to public
with check (true);
