revoke insert, update on public.trade_receipts from anon, authenticated;
revoke insert, update on public.wallet_transfers from anon, authenticated;

drop policy if exists "allow public receipt writes" on public.trade_receipts;
drop policy if exists "allow public receipt updates" on public.trade_receipts;
drop policy if exists "allow public transfer writes" on public.wallet_transfers;
drop policy if exists "allow public transfer updates" on public.wallet_transfers;
