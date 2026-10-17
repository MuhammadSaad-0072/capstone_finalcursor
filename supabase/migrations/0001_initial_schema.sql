create table if not exists public.paper_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asset_symbol text not null check (asset_symbol ~ '^[A-Z0-9.-]{1,10}$'),
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(20, 6) not null check (quantity > 0),
  price numeric(20, 6) not null check (price > 0),
  created_at timestamptz not null default now()
);

create index if not exists paper_trades_user_created_at_idx
  on public.paper_trades (user_id, created_at desc);

alter table public.paper_trades enable row level security;

revoke all on table public.paper_trades from anon, authenticated;
grant select on table public.paper_trades to authenticated;
grant select, insert on table public.paper_trades to service_role;

drop policy if exists "Users can read their own paper trades"
  on public.paper_trades;
create policy "Users can read their own paper trades"
  on public.paper_trades
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own paper trades"
  on public.paper_trades;
create policy "Users can insert their own paper trades"
  on public.paper_trades
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.record_paper_trade(
  p_user_id uuid,
  p_asset_symbol text,
  p_side text,
  p_quantity numeric,
  p_price numeric
)
returns public.paper_trades
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_position numeric;
  v_cash numeric;
  v_trade public.paper_trades;
begin
  if p_user_id is null then
    raise exception using message = 'Authenticated user is required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if p_asset_symbol !~ '^[A-Z0-9.-]{1,10}$'
    or p_side not in ('buy', 'sell')
    or p_quantity <= 0
    or p_price <= 0 then
    raise exception using message = 'Invalid paper trade';
  end if;

  select
    coalesce(sum(case when side = 'buy' then quantity else -quantity end), 0),
    100000 - coalesce(sum(
      case when side = 'buy' then quantity * price else -quantity * price end
    ), 0)
  into v_position, v_cash
  from public.paper_trades
  where user_id = p_user_id
    and (p_side = 'buy' or asset_symbol = p_asset_symbol);

  if p_side = 'sell' and v_position < p_quantity then
    raise exception using message = 'Insufficient paper position';
  end if;
  if p_side = 'buy' and v_cash < p_quantity * p_price then
    raise exception using message = 'Insufficient paper cash';
  end if;

  insert into public.paper_trades (user_id, asset_symbol, side, quantity, price)
  values (p_user_id, p_asset_symbol, p_side, p_quantity, p_price)
  returning * into v_trade;

  return v_trade;
end;
$$;

revoke all on function public.record_paper_trade(uuid, text, text, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.record_paper_trade(uuid, text, text, numeric, numeric)
  to service_role;
